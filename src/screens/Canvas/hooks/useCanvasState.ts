import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { getSelectedItem, useCanvasStore, type CanvasTool } from '../../../store/canvasStore'
import type { ArrowType, CanvasBackground } from '../../../types'

interface CanvasSize {
  width: number
  height: number
}

const SELECT_TOOL: CanvasTool = { kind: 'select' }

function sameTool(a: CanvasTool, b: CanvasTool): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'place' && b.kind === 'place') return a.type === b.type
  if (a.kind === 'draw' && b.kind === 'draw') return a.type === b.type
  return true
}

export function useCanvasState() {
  const background = useCanvasStore((state) => state.background)
  const objects = useCanvasStore((state) => state.objects)
  const arrows = useCanvasStore((state) => state.arrows)
  const tool = useCanvasStore((state) => state.tool)
  // getSelectedItem builds a new wrapper object on every call — useShallow keeps the snapshot
  // referentially stable across renders (shallow-comparing its fields) when nothing selection-
  // relevant actually changed, which zustand's useSyncExternalStore-based binding requires to
  // avoid re-rendering forever ("Maximum update depth exceeded").
  const selected = useCanvasStore(useShallow(getSelectedItem))
  const historyIndex = useCanvasStore((state) => state.historyIndex)
  const historyLength = useCanvasStore((state) => state.history.length)
  const savedAtHistoryIndex = useCanvasStore((state) => state.savedAtHistoryIndex)

  const setBackground = useCanvasStore((state) => state.setBackground)
  const setTool = useCanvasStore((state) => state.setTool)
  const selectItem = useCanvasStore((state) => state.selectItem)
  const placeObject = useCanvasStore((state) => state.placeObject)
  const moveObject = useCanvasStore((state) => state.moveObject)
  const rotateObject = useCanvasStore((state) => state.rotateObject)
  const scaleObject = useCanvasStore((state) => state.scaleObject)
  const addArrow = useCanvasStore((state) => state.addArrow)
  const moveArrow = useCanvasStore((state) => state.moveArrow)
  const duplicateSelected = useCanvasStore((state) => state.duplicateSelected)
  const bringSelectedToFront = useCanvasStore((state) => state.bringSelectedToFront)
  const deleteSelected = useCanvasStore((state) => state.deleteSelected)
  const undo = useCanvasStore((state) => state.undo)
  const redo = useCanvasStore((state) => state.redo)
  const markSaved = useCanvasStore((state) => state.markSaved)
  const reset = useCanvasStore((state) => state.reset)

  // Tapping the already-armed tool again disarms it back to select (toggle) — same UX as
  // Session 2's placement tools, extended to the new arrow-drawing tools.
  const selectTool = useCallback(
    (next: CanvasTool) => {
      setTool(sameTool(tool, next) ? SELECT_TOOL : next)
    },
    [tool, setTool]
  )

  const selectBackground = useCallback(
    (next: CanvasBackground) => {
      setBackground(next)
    },
    [setBackground]
  )

  const place = useCallback(
    (toolType: Extract<CanvasTool, { kind: 'place' }>['type'], x: number, y: number, canvasSize: CanvasSize) => {
      placeObject(toolType, x, y, canvasSize)
    },
    [placeObject]
  )

  const drawArrow = useCallback(
    (type: ArrowType, points: { x: number; y: number }[]) => {
      addArrow(type, points)
    },
    [addArrow]
  )

  const deselectAll = useCallback(() => selectItem(null), [selectItem])

  return {
    background,
    objects,
    arrows,
    tool,
    selected,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < historyLength - 1,
    hasUnsavedChanges: historyIndex !== savedAtHistoryIndex,

    selectTool,
    selectBackground,
    place,
    moveObject,
    rotateObject,
    scaleObject,
    drawArrow,
    moveArrow,
    selectItem,
    deselectAll,
    duplicateSelected,
    bringSelectedToFront,
    deleteSelected,
    undo,
    redo,
    markSaved,
    reset,
  }
}
