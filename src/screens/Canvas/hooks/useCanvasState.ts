import { useCallback } from 'react'

import { useCanvasStore, type PlaceableToolType } from '../../../store/canvasStore'
import type { CanvasBackground } from '../../../types'

interface CanvasSize {
  width: number
  height: number
}

export function useCanvasState() {
  const background = useCanvasStore((state) => state.background)
  const objects = useCanvasStore((state) => state.objects)
  const activeTool = useCanvasStore((state) => state.activeTool)
  const setBackground = useCanvasStore((state) => state.setBackground)
  const setActiveTool = useCanvasStore((state) => state.setActiveTool)
  const placeObject = useCanvasStore((state) => state.placeObject)
  const moveObject = useCanvasStore((state) => state.moveObject)

  // Tapping the already-armed tool again disarms it (toggle), so a coach can stop
  // placing without needing a dedicated "select" tool (that arrives in Session 3).
  const selectTool = useCallback(
    (tool: PlaceableToolType) => {
      setActiveTool(activeTool === tool ? null : tool)
    },
    [activeTool, setActiveTool]
  )

  const selectBackground = useCallback(
    (next: CanvasBackground) => {
      setBackground(next)
    },
    [setBackground]
  )

  const place = useCallback(
    (tool: PlaceableToolType, x: number, y: number, canvasSize: CanvasSize) => {
      placeObject(tool, x, y, canvasSize)
    },
    [placeObject]
  )

  return {
    background,
    objects,
    activeTool,
    selectTool,
    selectBackground,
    place,
    moveObject,
  }
}
