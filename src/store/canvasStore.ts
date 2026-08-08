import { create } from 'zustand'

import { createDefaultObject } from '../utils/canvasUtils'
import type { CanvasBackground, PlacedObject } from '../types'

export type PlaceableToolType =
  | 'player-blank'
  | 'player-gk'
  | 'player-co'
  | 'cone'
  | 'pole'
  | 'ladder'
  | 'flag'
  | 'disc'
  | 'goal'
  | 'mini-goal'
  | 'ball-bw'
  | 'ball-color'

interface CanvasSize {
  width: number
  height: number
}

interface CanvasStoreState {
  background: CanvasBackground
  objects: PlacedObject[]
  activeTool: PlaceableToolType | null
  setBackground: (background: CanvasBackground) => void
  setActiveTool: (tool: PlaceableToolType | null) => void
  placeObject: (tool: PlaceableToolType, x: number, y: number, canvasSize: CanvasSize) => void
  moveObject: (id: string, x: number, y: number) => void
  reset: () => void
}

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  background: 'full-pitch',
  objects: [],
  activeTool: null,

  setBackground: (background) => set({ background }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  placeObject: (tool, x, y, canvasSize) =>
    set((state) => ({
      objects: [...state.objects, createDefaultObject(tool, x, y, canvasSize)],
    })),

  moveObject: (id, x, y) =>
    set((state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, x, y } : object)),
    })),

  reset: () => set({ background: 'full-pitch', objects: [], activeTool: null }),
}))
