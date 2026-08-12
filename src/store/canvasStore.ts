import { randomUUID } from 'expo-crypto'
import { create } from 'zustand'

import { createDefaultObject, MIN_ZONE_SIZE_PX } from '../utils/canvasUtils'
import type { Arrow, ArrowType, CanvasBackground, PlacedObject } from '../types'

// Pole/Ladder/Flag/Disc are intentionally absent — dropped from the palette for a tighter
// tool set (see types/canvas.ts); their PlacedObject types remain for a possible future re-add.
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
  | 'shape-circle'

export type CanvasTool =
  | { kind: 'select' }
  | { kind: 'place'; type: PlaceableToolType }
  | { kind: 'draw'; type: ArrowType }

const SELECT_TOOL: CanvasTool = { kind: 'select' }

interface CanvasSize {
  width: number
  height: number
}

// Rectangle/circle placement is a click-drag-release gesture (like drawing an arrow), not a
// single tap — touch-down is one corner/diameter endpoint, release is the other. See
// useCanvasGestures.ts's 'placeShape' interaction mode and placeShapeFromPoints below.
export type ShapeToolType = Extract<PlaceableToolType, 'shape-rect' | 'shape-circle'>

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
// even though they live in two separate arrays — so "bring to front" on a line can actually
// place it above equipment, not just reorder it among other lines. Computed from current state
// rather than a persisted counter, so it needs no separate undo/redo bookkeeping of its own.
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
  scaleObject: (id: string, scale: number) => void
  resizeObject: (id: string, width: number, height: number) => void
  setObjectColor: (id: string, color: string) => void

  addArrow: (type: ArrowType, points: { x: number; y: number }[]) => void
  moveArrow: (id: string, dx: number, dy: number) => void

  duplicateSelected: () => void
  bringSelectedToFront: () => void
  deleteSelected: () => void

  undo: () => void
  redo: () => void
  markSaved: () => void

  reset: () => void
}

const initialSnapshot: CanvasSnapshot = { background: 'full-pitch', objects: [], arrows: [] }

export const useCanvasStore = create<CanvasStoreState>((set, get) => {
  // Every canvas-data mutation (place/move/rotate/scale/draw/duplicate/bring-to-front/delete/
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

    // p1 is the drag's touch-down point, p2 is its release point. A rectangle's opposite
    // corners become its center + width/height; a circle's two points become the endpoints of
    // a diameter. Floors the result at MIN_ZONE_SIZE_PX (screen px, converted to normalized
    // fractions here) so a very short drag still produces a visible, usable shape.
    placeShapeFromPoints: (type, p1, p2, canvasSize) => {
      const state = get()
      const cx = clamp01((p1.x + p2.x) / 2)
      const cy = clamp01((p1.y + p2.y) / 2)
      const zIndex = nextZIndex(state)
      const base = { id: randomUUID(), x: cx, y: cy, rotation: 0, scale: 1, zIndex }

      const object: PlacedObject =
        type === 'shape-rect'
          ? {
              ...base,
              type: 'zone',
              width: Math.max(MIN_ZONE_SIZE_PX / canvasSize.width, Math.abs(p2.x - p1.x)),
              height: Math.max(MIN_ZONE_SIZE_PX / canvasSize.height, Math.abs(p2.y - p1.y)),
            }
          : {
              ...base,
              type: 'circle-zone',
              radius:
                Math.max(MIN_ZONE_SIZE_PX / 2, Math.hypot((p2.x - p1.x) * canvasSize.width, (p2.y - p1.y) * canvasSize.height) / 2) /
                canvasSize.width,
            }

      commit({ objects: [...state.objects, object] })
      // Auto-select + disarm, same rationale as addArrow — the shape just placed is the likely
      // next thing the coach adjusts (resize/move), not the start of another one.
      set({ selectedId: object.id, tool: SELECT_TOOL })
    },

    moveObject: (id, x, y) => {
      commit({ objects: get().objects.map((object) => (object.id === id ? { ...object, x, y } : object)) })
    },

    rotateObject: (id, rotation) => {
      commit({ objects: get().objects.map((object) => (object.id === id ? { ...object, rotation } : object)) })
    },

    scaleObject: (id, scale) => {
      commit({ objects: get().objects.map((object) => (object.id === id ? { ...object, scale } : object)) })
    },

    // Independent width/height resize — only meaningful for 'zone' (rectangle), which is the
    // one shape type resized by dragging its two dimensions directly rather than via the
    // shared uniform `scale` multiplier every other object uses. See useCanvasGestures.ts's
    // 'resize' interaction mode.
    resizeObject: (id, width, height) => {
      commit({
        objects: get().objects.map((object) =>
          object.id === id && object.type === 'zone' ? { ...object, width, height } : object
        ),
      })
    },

    setObjectColor: (id, color) => {
      commit({
        objects: get().objects.map((object) =>
          object.id === id && (object.type === 'cone' || object.type === 'disc') ? { ...object, color } : object
        ),
      })
    },

    addArrow: (type, points) => {
      const state = get()
      const arrow: Arrow = { id: randomUUID(), type, points, zIndex: nextZIndex(state) }
      commit({ arrows: [...state.arrows, arrow] })
      // Auto-disarm back to select mode so the very next touch moves/selects the arrow just
      // drawn, rather than reading as the start of another one — drawing-then-immediately-
      // adjusting is the common case, unlike equipment tools where re-placing several of the
      // same item in a row is common and staying armed is the right default.
      set({ selectedId: arrow.id, tool: SELECT_TOOL })
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

    bringSelectedToFront: () => {
      const state = get()
      const selected = getSelectedItem(state)
      if (!selected) return

      const zIndex = nextZIndex(state)
      if (selected.kind === 'object') {
        commit({
          objects: state.objects.map((object) => (object.id === selected.object.id ? { ...object, zIndex } : object)),
        })
      } else {
        commit({
          arrows: state.arrows.map((arrow) => (arrow.id === selected.arrow.id ? { ...arrow, zIndex } : arrow)),
        })
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
