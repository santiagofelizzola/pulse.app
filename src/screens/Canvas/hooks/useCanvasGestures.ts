import { Gesture } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'

import { HIT_RADIUS, TAP_SLOP } from '../../../utils/canvasUtils'
import type { PlaceableToolType } from '../../../store/canvasStore'
import type { PlacedObject } from '../../../types'

export interface DragState {
  id: string | null
  dx: number
  dy: number
}

interface CanvasSize {
  width: number
  height: number
}

interface UseCanvasGesturesArgs {
  objects: PlacedObject[]
  canvasSize: CanvasSize
  activeTool: PlaceableToolType | null
  onPlace: (tool: PlaceableToolType, x: number, y: number) => void
  onMove: (id: string, x: number, y: number) => void
}

export function useCanvasGestures({ objects, canvasSize, activeTool, onPlace, onMove }: UseCanvasGesturesArgs) {
  const dragState = useSharedValue<DragState>({ id: null, dx: 0, dy: 0 })
  const startPoint = useSharedValue({ x: 0, y: 0 })
  const startObjectPoint = useSharedValue({ x: 0, y: 0 })

  const commitMove = (id: string, x: number, y: number) => {
    onMove(id, x, y)
    dragState.value = { id: null, dx: 0, dy: 0 }
  }

  const pan = Gesture.Pan()
    .maxPointers(1)
    // Pan gestures don't activate (and therefore never fire onEnd) until the touch moves past
    // a default distance threshold — a stationary tap never crosses it, so tap-to-place would
    // silently never fire. minDistance(0) makes the gesture activate immediately on touch-down;
    // tap vs. drag is still disambiguated ourselves below via TAP_SLOP.
    .minDistance(0)
    .onBegin((event) => {
      startPoint.value = { x: event.x, y: event.y }

      let hitId: string | null = null
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i]
        const px = object.x * canvasSize.width
        const py = object.y * canvasSize.height
        const distance = Math.hypot(event.x - px, event.y - py)
        if (distance <= HIT_RADIUS) {
          hitId = object.id
          startObjectPoint.value = { x: px, y: py }
          break
        }
      }

      dragState.value = { id: hitId, dx: 0, dy: 0 }
    })
    .onUpdate((event) => {
      if (dragState.value.id) {
        dragState.value = { id: dragState.value.id, dx: event.translationX, dy: event.translationY }
      }
    })
    .onEnd((event) => {
      const { id } = dragState.value
      if (id) {
        if (canvasSize.width === 0 || canvasSize.height === 0) return
        const finalX = (startObjectPoint.value.x + event.translationX) / canvasSize.width
        const finalY = (startObjectPoint.value.y + event.translationY) / canvasSize.height
        const clampedX = Math.min(1, Math.max(0, finalX))
        const clampedY = Math.min(1, Math.max(0, finalY))
        runOnJS(commitMove)(id, clampedX, clampedY)
      } else if (activeTool) {
        const distance = Math.hypot(event.translationX, event.translationY)
        if (distance < TAP_SLOP && canvasSize.width > 0 && canvasSize.height > 0) {
          const nx = startPoint.value.x / canvasSize.width
          const ny = startPoint.value.y / canvasSize.height
          runOnJS(onPlace)(activeTool, nx, ny)
        }
      }
    })
    .onFinalize((_event, success) => {
      if (!success) {
        dragState.value = { id: null, dx: 0, dy: 0 }
      }
    })

  return { pan, dragState }
}
