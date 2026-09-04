import { randomUUID } from 'expo-crypto'
import { create } from 'zustand'

import { createDefaultObject, isColorableObject, MIN_ZONE_SIZE_PX } from '../utils/canvasUtils'
import type { Arrow, ArrowType, CanvasBackground, PlacedObject } from '../types'

// Pole/Ladder/Flag/Disc are intentionally absent — dropped from the palette for a tighter
// tool set (see types/canvas.ts); their PlacedObject types remain for a possible future re-add.
// 'shape-circle' left the same way: the CircleZone type, its interface and its renderer are all
// kept so saved drills containing one still render, only the placement affordance is gone.
export type PlaceableToolType =
  | 'player-blank'
  | 'player-gk'
  | 'player-co'
  | 'cone'
  | 'goal'
  | 'mini-goal'
  | 'ball-bw'
  | 'ball-color'
  | 'shape-rect'

// 'color' is a MODE, not a per-object edit: armed from the tool palette with a chosen color, it
// stays armed and repaints every colorable object the coach taps (see CanvasScreen's tap router).
// It never becomes the default for newly placed objects — createDefaultObject is untouched by it.
export type CanvasTool =
  | { kind: 'select' }
  | { kind: 'place'; type: PlaceableToolType }
  | { kind: 'draw'; type: ArrowType }
  | { kind: 'color'; color: string }

const SELECT_TOOL: CanvasTool = { kind: 'select' }

interface CanvasSize {
  width: number
  height: number
}

// Rectangle placement is a click-drag-release gesture (like drawing an arrow), not a single
// tap — touch-down is one corner, release is the opposite one. See useCanvasGestures.ts's
// 'placeShape' interaction mode and placeShapeFromPoints below. Still its own type rather than
// the literal, since it names a role ("the tools placed by drag") the call sites read from.
export type ShapeToolType = Extract<PlaceableToolType, 'shape-rect'>

interface CanvasSnapshot {
  background: CanvasBackground
  objects: PlacedObject[]
  arrows: Arrow[]
}

// A tap-to-duplicate offset, in the same normalized 0..1 space as object.x/y — keeps the
// copy visibly distinct from its source without needing the coach to drag it apart first.
const DUPLICATE_OFFSET = 0.04

// Bounds how far back undo can go. Snapshot-based (not diff-based) undo is simple and correct
// for a canvas this size (a drill has at most a few dozen objects/arrows); the cap just bounds
// memory for a very long editing session.
const MAX_HISTORY = 50

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

// Objects and arrows paint in a single shared stacking order (design.md's "Layering" intent),
// even though they live in two separate arrays — so a newly drawn line genuinely lands above
// existing equipment, not merely above other lines. Computed from current state rather than a
// persisted counter, so it needs no separate undo/redo bookkeeping of its own.
//
// The counter and every stored zIndex stay exactly as they were; what was removed is only the
// selection toolbar's "bring to front" ACTION, which used to re-stamp a selected item with this.
function nextZIndex(state: Pick<CanvasStoreState, 'objects' | 'arrows'>): number {
  const max = Math.max(0, ...state.objects.map((o) => o.zIndex ?? 0), ...state.arrows.map((a) => a.zIndex ?? 0))
  return max + 1
}

export type SelectedItem = { kind: 'object'; object: PlacedObject } | { kind: 'arrow'; arrow: Arrow } | null

// Pure function of state so it can be used directly as a zustand selector.
export function getSelectedItem(state: Pick<CanvasStoreState, 'objects' | 'arrows' | 'selectedId'>): SelectedItem {
  if (!state.selectedId) return null
  const object = state.objects.find((item) => item.id === state.selectedId)
  if (object) return { kind: 'object', object }
  const arrow = state.arrows.find((item) => item.id === state.selectedId)
  if (arrow) return { kind: 'arrow', arrow }
  return null
}

interface CanvasStoreState {
  background: CanvasBackground
  objects: PlacedObject[]
  arrows: Arrow[]
  tool: CanvasTool
  selectedId: string | null
  history: CanvasSnapshot[]
  historyIndex: number
  savedAtHistoryIndex: number

  setBackground: (background: CanvasBackground) => void
  setTool: (tool: CanvasTool) => void
  selectItem: (id: string | null) => void

  placeObject: (tool: PlaceableToolType, x: number, y: number, canvasSize: CanvasSize) => void
  placeShapeFromPoints: (
    type: ShapeToolType,
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    canvasSize: CanvasSize
  ) => void
  moveObject: (id: string, x: number, y: number) => void
  rotateObject: (id: string, rotation: number) => void
  setObjectColor: (id: string, color: string) => void

  addArrow: (type: ArrowType, points: { x: number; y: number }[]) => void
  moveArrow: (id: string, dx: number, dy: number) => void

  duplicateSelected: () => void
  deleteSelected: () => void

  undo: () => void
  redo: () => void
  markSaved: () => void

  reset: () => void
}

const initialSnapshot: CanvasSnapshot = { background: 'blank', objects: [], arrows: [] }

export const useCanvasStore = create<CanvasStoreState>((set, get) => {
  // Every canvas-data mutation (place/move/rotate/scale/resize/recolor/draw/duplicate/delete/
  // background change) funnels through here so undo/redo has one single source of truth.
  // Ephemeral UI state (tool, selection) is NOT part of history — only canvas *data* is.
  function commit(patch: Partial<CanvasSnapshot>) {
    const state = get()
    const next: CanvasSnapshot = {
      background: patch.background ?? state.background,
      objects: patch.objects ?? state.objects,
      arrows: patch.arrows ?? state.arrows,
    }

    const truncated = state.history.slice(0, state.historyIndex + 1)
    let nextHistory = [...truncated, next]
    let savedAtHistoryIndex = state.savedAtHistoryIndex

    const overflow = nextHistory.length - MAX_HISTORY
    if (overflow > 0) {
      nextHistory = nextHistory.slice(overflow)
      // The saved snapshot may have scrolled out of the retained window — clamp rather than
      // go negative. This only matters after 50+ edits since the last save, an edge case.
      savedAtHistoryIndex = Math.max(0, savedAtHistoryIndex - overflow)
    }

    set({
      ...next,
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
      savedAtHistoryIndex,
    })
  }

  return {
    ...initialSnapshot,
    tool: SELECT_TOOL,
    selectedId: null,
    history: [initialSnapshot],
    historyIndex: 0,
    savedAtHistoryIndex: 0,

    setBackground: (background) => commit({ background }),

    // Switching to a placement/draw tool clears selection so the selection overlay never
    // renders (and its gesture priority never competes) outside of select mode.
    setTool: (tool) => set({ tool, selectedId: tool.kind === 'select' ? get().selectedId : null }),

    selectItem: (id) => set({ selectedId: id }),

    placeObject: (tool, x, y, canvasSize) => {
      const state = get()
      const object = createDefaultObject(tool, x, y, canvasSize, nextZIndex(state))
      commit({ objects: [...state.objects, object] })
      // Equipment/player tools stay armed after placing (so several in a row don't need
      // re-arming), and a touch mid-streak that happens to land on an existing object still
      // selects it (see useCanvasGestures). Clearing selection here means that selection can't
      // outlive the *next* placement — its toolbar won't linger through the rest of the streak.
      set({ selectedId: null })
    },

    // p1 is the drag's touch-down point, p2 is its release point, and they are the rectangle's
    // opposite corners — turned into a center plus width/height here. Floors the result at
    // MIN_ZONE_SIZE_PX (screen px, converted to normalized fractions here) so a very short drag
    // still produces a visible, usable shape. `type` is a single-member union today (the circle
    // left the palette), kept as a parameter so re-adding a drag-placed shape is additive.
    placeShapeFromPoints: (_type, p1, p2, canvasSize) => {
      const state = get()
      const cx = clamp01((p1.x + p2.x) / 2)
      const cy = clamp01((p1.y + p2.y) / 2)
      const zIndex = nextZIndex(state)

      const object: PlacedObject = {
        id: randomUUID(),
        x: cx,
        y: cy,
        rotation: 0,
        scale: 1,
        zIndex,
        type: 'zone',
        width: Math.max(MIN_ZONE_SIZE_PX / canvasSize.width, Math.abs(p2.x - p1.x)),
        height: Math.max(MIN_ZONE_SIZE_PX / canvasSize.height, Math.abs(p2.y - p1.y)),
      }

      commit({ objects: [...state.objects, object] })
      // Disarm back to select mode (the shape just placed is the likely next thing the coach
      // adjusts, not the start of another one) but don't auto-select it — selection is only
      // ever a deliberate tap, same rule as placeObject not selecting the object it just placed.
      set({ selectedId: null, tool: SELECT_TOOL })
    },

    moveObject: (id, x, y) => {
      commit({ objects: get().objects.map((object) => (object.id === id ? { ...object, x, y } : object)) })
    },

    rotateObject: (id, rotation) => {
      commit({ objects: get().objects.map((object) => (object.id === id ? { ...object, rotation } : object)) })
    },

    // There is deliberately no scaleObject/resizeObject: the scale and resize handles were
    // removed, so an object's size is fixed once placed. `scale` on BaseCanvasObject and Zone's
    // width/height stay in the MODEL — every already-saved drill renders from them and the
    // placement drag still sets a zone's — there is simply no mutator that changes them.

    // Bails before commit() on both no-op cases — a non-colorable (or missing) target, and a target
    // that already carries this exact color. Every commit pushes a history entry, and the color
    // TOOL fires this on every tap it lands on, so without these guards a stray tap on a ball, or a
    // re-tap on an already-red marker, would each cost the coach an undo press that changes nothing.
    setObjectColor: (id, color) => {
      const target = get().objects.find((object) => object.id === id)
      if (!target || !isColorableObject(target) || target.color === color) return

      commit({
        objects: get().objects.map((object) => (object.id === id ? { ...object, color } : object)),
      })
    },

    addArrow: (type, points) => {
      const state = get()
      const arrow: Arrow = { id: randomUUID(), type, points, zIndex: nextZIndex(state) }
      commit({ arrows: [...state.arrows, arrow] })
      // Auto-disarm back to select mode so the very next touch can tap-select/move the arrow
      // just drawn, rather than reading as the start of another one — drawing-then-immediately-
      // adjusting is the common case, unlike equipment tools where re-placing several of the
      // same item in a row is common and staying armed is the right default. But don't
      // auto-select it: selection is only ever a deliberate tap, same rule as placeObject.
      set({ selectedId: null, tool: SELECT_TOOL })
    },

    moveArrow: (id, dx, dy) => {
      commit({
        arrows: get().arrows.map((arrow) =>
          arrow.id === id
            ? { ...arrow, points: arrow.points.map((point) => ({ x: clamp01(point.x + dx), y: clamp01(point.y + dy) })) }
            : arrow
        ),
      })
    },

    duplicateSelected: () => {
      const state = get()
      const selected = getSelectedItem(state)
      if (!selected) return

      if (selected.kind === 'object') {
        const copy: PlacedObject = {
          ...selected.object,
          id: randomUUID(),
          x: clamp01(selected.object.x + DUPLICATE_OFFSET),
          y: clamp01(selected.object.y + DUPLICATE_OFFSET),
          zIndex: nextZIndex(state),
        }
        commit({ objects: [...state.objects, copy] })
        set({ selectedId: copy.id })
      } else {
        const copy: Arrow = {
          ...selected.arrow,
          id: randomUUID(),
          points: selected.arrow.points.map((point) => ({
            x: clamp01(point.x + DUPLICATE_OFFSET),
            y: clamp01(point.y + DUPLICATE_OFFSET),
          })),
          zIndex: nextZIndex(state),
        }
        commit({ arrows: [...state.arrows, copy] })
        set({ selectedId: copy.id })
      }
    },

    deleteSelected: () => {
      const state = get()
      const selected = getSelectedItem(state)
      if (!selected) return

      if (selected.kind === 'object') {
        commit({ objects: state.objects.filter((object) => object.id !== selected.object.id) })
      } else {
        commit({ arrows: state.arrows.filter((arrow) => arrow.id !== selected.arrow.id) })
      }
      set({ selectedId: null })
    },

    undo: () => {
      const state = get()
      if (state.historyIndex <= 0) return
      const nextIndex = state.historyIndex - 1
      set({ ...state.history[nextIndex], historyIndex: nextIndex, selectedId: null })
    },

    redo: () => {
      const state = get()
      if (state.historyIndex >= state.history.length - 1) return
      const nextIndex = state.historyIndex + 1
      set({ ...state.history[nextIndex], historyIndex: nextIndex, selectedId: null })
    },

    markSaved: () => set({ savedAtHistoryIndex: get().historyIndex }),

    reset: () =>
      set({
        ...initialSnapshot,
        tool: SELECT_TOOL,
        selectedId: null,
        history: [initialSnapshot],
        historyIndex: 0,
        savedAtHistoryIndex: 0,
      }),
  }
})
