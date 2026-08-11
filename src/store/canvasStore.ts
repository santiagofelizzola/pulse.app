import { randomUUID } from 'expo-crypto'
import { create } from 'zustand'

import { createDefaultObject } from '../utils/canvasUtils'
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

export type CanvasTool =
  | { kind: 'select' }
  | { kind: 'place'; type: PlaceableToolType }
  | { kind: 'draw'; type: ArrowType }

const SELECT_TOOL: CanvasTool = { kind: 'select' }

interface CanvasSize {
  width: number
  height: number
}

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
  moveObject: (id: string, x: number, y: number) => void
  rotateObject: (id: string, rotation: number) => void
  scaleObject: (id: string, scale: number) => void

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
      const object = createDefaultObject(tool, x, y, canvasSize)
      commit({ objects: [...get().objects, object] })
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

    addArrow: (type, points) => {
      const arrow: Arrow = { id: randomUUID(), type, points }
      commit({ arrows: [...get().arrows, arrow] })
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
        }
        commit({ arrows: [...state.arrows, copy] })
        set({ selectedId: copy.id })
      }
    },

    bringSelectedToFront: () => {
      const state = get()
      const selected = getSelectedItem(state)
      if (!selected) return

      if (selected.kind === 'object') {
        const rest = state.objects.filter((object) => object.id !== selected.object.id)
        commit({ objects: [...rest, selected.object] })
      } else {
        const rest = state.arrows.filter((arrow) => arrow.id !== selected.arrow.id)
        commit({ arrows: [...rest, selected.arrow] })
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
