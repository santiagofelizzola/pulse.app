import { useState } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'

import { canvas } from '../../../theme/theme'
import {
  distanceToCubicBezier,
  getObjectFootprint,
  HANDLE_HIT_RADIUS,
  HIT_RADIUS,
  ROTATE_HANDLE_GAP,
  rotatePointAround,
  SCALE_MAX,
  SCALE_MIN,
  TAP_SLOP,
} from '../../../utils/canvasUtils'
import type { CanvasTool, PlaceableToolType, SelectedItem } from '../../../store/canvasStore'
import type { Arrow, ArrowType, PlacedObject } from '../../../types'

export type InteractionMode = 'idle' | 'move' | 'rotate' | 'scale' | 'drawArrow'

export interface InteractionState {
  mode: InteractionMode
  targetId: string | null
  targetKind: 'object' | 'arrow' | null
  dx: number
  dy: number
  rotation: number
  scale: number
  drawType: ArrowType | null
  drawStart: { x: number; y: number }
  drawCurrent: { x: number; y: number }
}

const IDLE_STATE: InteractionState = {
  mode: 'idle',
  targetId: null,
  targetKind: null,
  dx: 0,
  dy: 0,
  rotation: 0,
  scale: 1,
  drawType: null,
  drawStart: { x: 0, y: 0 },
  drawCurrent: { x: 0, y: 0 },
}

// Below this drag distance, a draw-tool gesture is treated as an accidental tap, not an arrow.
const MIN_ARROW_LENGTH = 12

interface CanvasSize {
  width: number
  height: number
}

interface UseCanvasGesturesArgs {
  objects: PlacedObject[]
  arrows: Arrow[]
  canvasSize: CanvasSize
  tool: CanvasTool
  selected: SelectedItem
  onPlace: (tool: PlaceableToolType, x: number, y: number) => void
  onSelect: (id: string | null) => void
  onMoveObject: (id: string, x: number, y: number) => void
  onRotateObject: (id: string, rotation: number) => void
  onScaleObject: (id: string, scale: number) => void
  onDrawArrow: (type: ArrowType, points: { x: number; y: number }[]) => void
  onMoveArrow: (id: string, dx: number, dy: number) => void
}

export function useCanvasGestures({
  objects,
  arrows,
  canvasSize,
  tool,
  selected,
  onPlace,
  onSelect,
  onMoveObject,
  onRotateObject,
  onScaleObject,
  onDrawArrow,
  onMoveArrow,
}: UseCanvasGesturesArgs) {
  const interaction = useSharedValue<InteractionState>(IDLE_STATE)
  const startPoint = useSharedValue({ x: 0, y: 0 })
  const startObjectPoint = useSharedValue({ x: 0, y: 0 })
  const targetCenter = useSharedValue({ x: 0, y: 0 })
  const targetScaleRef = useSharedValue(1)
  // JS-thread mirror of "is a gesture live right now" — SelectionOverlay hides while true so it
  // never lags the worklet-driven live preview (design.md §10: reposition, don't jump).
  const [isInteracting, setIsInteracting] = useState(false)

  const beginInteracting = () => setIsInteracting(true)
  const endInteracting = () => setIsInteracting(false)

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onBegin((event) => {
      startPoint.value = { x: event.x, y: event.y }

      // Handles on the current selection take priority over anything else. `selected` is only
      // ever non-null while tool.kind === 'select' (place/draw tools clear it on arming), so
      // this is a no-op while a placement/draw tool is active.
      if (selected && selected.kind === 'object') {
        const object = selected.object
        const cx = object.x * canvasSize.width
        const cy = object.y * canvasSize.height
        const footprint = getObjectFootprint(object, canvasSize)
        const halfW = (footprint.width * object.scale) / 2
        const halfH = (footprint.height * object.scale) / 2

        const rotateHandle = rotatePointAround({ x: 0, y: -halfH - ROTATE_HANDLE_GAP }, object.rotation, cx, cy)
        if (Math.hypot(event.x - rotateHandle.x, event.y - rotateHandle.y) <= HANDLE_HIT_RADIUS) {
          targetCenter.value = { x: cx, y: cy }
          interaction.value = { ...IDLE_STATE, mode: 'rotate', targetId: object.id, targetKind: 'object', rotation: object.rotation }
          runOnJS(beginInteracting)()
          return
        }

        const scaleHandle = rotatePointAround({ x: halfW, y: halfH }, object.rotation, cx, cy)
        if (Math.hypot(event.x - scaleHandle.x, event.y - scaleHandle.y) <= HANDLE_HIT_RADIUS) {
          targetCenter.value = { x: cx, y: cy }
          targetScaleRef.value = Math.hypot(footprint.width / 2, footprint.height / 2)
          interaction.value = { ...IDLE_STATE, mode: 'scale', targetId: object.id, targetKind: 'object', scale: object.scale }
          runOnJS(beginInteracting)()
          return
        }
      }

      // Hit-test topmost-group-first, mirroring actual paint order: player markers, then
      // equipment/other objects, then arrows (arrows render under equipment — see CanvasScreen).
      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i]
        if (object.type !== 'player') continue
        const px = object.x * canvasSize.width
        const py = object.y * canvasSize.height
        if (Math.hypot(event.x - px, event.y - py) <= HIT_RADIUS * object.scale) {
          startObjectPoint.value = { x: px, y: py }
          interaction.value = { ...IDLE_STATE, mode: 'move', targetId: object.id, targetKind: 'object' }
          runOnJS(onSelect)(object.id)
          runOnJS(beginInteracting)()
          return
        }
      }

      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i]
        if (object.type === 'player') continue
        const px = object.x * canvasSize.width
        const py = object.y * canvasSize.height
        if (Math.hypot(event.x - px, event.y - py) <= HIT_RADIUS * object.scale) {
          startObjectPoint.value = { x: px, y: py }
          interaction.value = { ...IDLE_STATE, mode: 'move', targetId: object.id, targetKind: 'object' }
          runOnJS(onSelect)(object.id)
          runOnJS(beginInteracting)()
          return
        }
      }

      for (let i = arrows.length - 1; i >= 0; i -= 1) {
        const arrow = arrows[i]
        const [p0, p1, p2, p3] = arrow.points.map((point) => ({
          x: point.x * canvasSize.width,
          y: point.y * canvasSize.height,
        }))
        if (distanceToCubicBezier({ x: event.x, y: event.y }, p0, p1, p2, p3) <= canvas.line.hitInflate) {
          interaction.value = { ...IDLE_STATE, mode: 'move', targetId: arrow.id, targetKind: 'arrow' }
          runOnJS(onSelect)(arrow.id)
          runOnJS(beginInteracting)()
          return
        }
      }

      // Nothing existing was under the touch — fall through to placing/drawing something new.
      // Checked regardless of which tool is armed (above) so touching an existing item always
      // moves it, even mid-placement-streak — a coach placing several cones in a row can still
      // nudge one without re-arming to a select tool first.
      if (tool.kind === 'draw') {
        interaction.value = {
          ...IDLE_STATE,
          mode: 'drawArrow',
          drawType: tool.type,
          drawStart: { x: event.x, y: event.y },
          drawCurrent: { x: event.x, y: event.y },
        }
        runOnJS(beginInteracting)()
      }
    })
    .onUpdate((event) => {
      const current = interaction.value
      if (current.mode === 'move') {
        interaction.value = { ...current, dx: event.translationX, dy: event.translationY }
      } else if (current.mode === 'rotate') {
        const angle = Math.atan2(event.y - targetCenter.value.y, event.x - targetCenter.value.x)
        interaction.value = { ...current, rotation: angle + Math.PI / 2 }
      } else if (current.mode === 'scale') {
        const distance = Math.hypot(event.x - targetCenter.value.x, event.y - targetCenter.value.y)
        const raw = distance / targetScaleRef.value
        interaction.value = { ...current, scale: Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw)) }
      } else if (current.mode === 'drawArrow') {
        interaction.value = { ...current, drawCurrent: { x: event.x, y: event.y } }
      }
    })
    .onEnd((event) => {
      const current = interaction.value
      const travel = Math.hypot(event.translationX, event.translationY)

      // A near-zero-travel "move" is really just the selection tap from onBegin — skip the
      // commit so tapping an object to select it doesn't push a no-op entry onto undo history.
      if (current.mode === 'move' && current.targetId && travel >= TAP_SLOP) {
        if (current.targetKind === 'object' && canvasSize.width > 0 && canvasSize.height > 0) {
          const finalX = (startObjectPoint.value.x + event.translationX) / canvasSize.width
          const finalY = (startObjectPoint.value.y + event.translationY) / canvasSize.height
          runOnJS(onMoveObject)(current.targetId, Math.min(1, Math.max(0, finalX)), Math.min(1, Math.max(0, finalY)))
        } else if (current.targetKind === 'arrow' && canvasSize.width > 0 && canvasSize.height > 0) {
          runOnJS(onMoveArrow)(current.targetId, event.translationX / canvasSize.width, event.translationY / canvasSize.height)
        }
      } else if (current.mode === 'rotate' && current.targetId && travel >= TAP_SLOP) {
        runOnJS(onRotateObject)(current.targetId, current.rotation)
      } else if (current.mode === 'scale' && current.targetId && travel >= TAP_SLOP) {
        runOnJS(onScaleObject)(current.targetId, current.scale)
      } else if (current.mode === 'drawArrow' && current.drawType) {
        if (travel >= MIN_ARROW_LENGTH && canvasSize.width > 0 && canvasSize.height > 0) {
          const start = { x: current.drawStart.x / canvasSize.width, y: current.drawStart.y / canvasSize.height }
          const end = { x: event.x / canvasSize.width, y: event.y / canvasSize.height }
          const cp1 = { x: start.x + (end.x - start.x) / 3, y: start.y + (end.y - start.y) / 3 }
          const cp2 = { x: start.x + ((end.x - start.x) * 2) / 3, y: start.y + ((end.y - start.y) * 2) / 3 }
          runOnJS(onDrawArrow)(current.drawType, [start, cp1, cp2, end])
        }
      } else if (current.mode === 'idle') {
        if (tool.kind === 'place' && travel < TAP_SLOP && canvasSize.width > 0 && canvasSize.height > 0) {
          const nx = startPoint.value.x / canvasSize.width
          const ny = startPoint.value.y / canvasSize.height
          runOnJS(onPlace)(tool.type, nx, ny)
        } else if (tool.kind === 'select' && travel < TAP_SLOP) {
          runOnJS(onSelect)(null)
        }
      }

      interaction.value = IDLE_STATE
      runOnJS(endInteracting)()
    })
    .onFinalize((_event, success) => {
      if (!success) {
        interaction.value = IDLE_STATE
        runOnJS(endInteracting)()
      }
    })

  return { pan, interaction, isInteracting }
}
