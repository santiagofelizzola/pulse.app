import { useEffect, useRef, useState } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'

import { canvas } from '../../../theme/theme'
import {
  distanceToCubicBezier,
  getObjectFootprint,
  HANDLE_HIT_RADIUS,
  HIT_RADIUS,
  isPointInObjectHit,
  MIN_ZONE_SIZE_PX,
  ROTATE_HANDLE_GAP,
  rotatePointAround,
  SCALE_MAX,
  SCALE_MIN,
  TAP_SLOP,
} from '../../../utils/canvasUtils'
import type { CanvasTool, PlaceableToolType, SelectedItem, ShapeToolType } from '../../../store/canvasStore'
import type { Arrow, ArrowType, PlacedObject } from '../../../types'

export type InteractionMode = 'idle' | 'move' | 'rotate' | 'scale' | 'resize' | 'drawArrow' | 'placeShape'

export interface InteractionState {
  mode: InteractionMode
  targetId: string | null
  targetKind: 'object' | 'arrow' | null
  dx: number
  dy: number
  rotation: number
  scale: number
  resizeWidth: number
  resizeHeight: number
  drawType: ArrowType | null
  placeShapeType: ShapeToolType | null
  drawStart: { x: number; y: number }
  drawCurrent: { x: number; y: number }
  // Bumped every onBegin. A commit (move/rotate/scale/resize) freezes `interaction` at its
  // final value instead of resetting to idle in onEnd — the reset waits for the committed
  // objects/arrows props to actually land (see the useEffect below) so the render never has a
  // frame where it falls back to the pre-drag prop position. `seq` lets that effect confirm
  // it's still clearing the gesture it was waiting for, not a newer one that started since.
  seq: number
}

const IDLE_STATE: InteractionState = {
  mode: 'idle',
  targetId: null,
  targetKind: null,
  dx: 0,
  dy: 0,
  rotation: 0,
  scale: 1,
  resizeWidth: 0,
  resizeHeight: 0,
  drawType: null,
  placeShapeType: null,
  drawStart: { x: 0, y: 0 },
  drawCurrent: { x: 0, y: 0 },
  seq: 0,
}

// Below this drag distance, a draw-tool or shape-placement gesture is treated as an accidental
// tap rather than a real arrow/shape.
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
  onResizeObject: (id: string, width: number, height: number) => void
  onPlaceShape: (type: ShapeToolType, p1: { x: number; y: number }, p2: { x: number; y: number }) => void
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
  onResizeObject,
  onPlaceShape,
  onDrawArrow,
  onMoveArrow,
}: UseCanvasGesturesArgs) {
  const interaction = useSharedValue<InteractionState>(IDLE_STATE)
  const startObjectPoint = useSharedValue({ x: 0, y: 0 })
  const targetCenter = useSharedValue({ x: 0, y: 0 })
  const targetScaleRef = useSharedValue(1)
  const interactionSeq = useSharedValue(0)
  // Object rotation captured at the start of a 'resize' drag — width/height changes come from
  // the drag point projected into the object's *local* (unrotated) axes, so the rotation used
  // for that projection must stay fixed for the gesture's duration, same reasoning as
  // targetScaleRef for uniform scale.
  const resizeRotationRef = useSharedValue(0)
  // JS-thread mirror of "is a gesture live right now" — SelectionOverlay hides while true so it
  // never lags the worklet-driven live preview (design.md §10: reposition, don't jump).
  const [isInteracting, setIsInteracting] = useState(false)

  const beginInteracting = () => setIsInteracting(true)
  const endInteracting = () => setIsInteracting(false)

  // Set (with the committing gesture's `seq`) right before the store mutation that will make
  // the commit's final position show up in `objects`/`arrows` props — see the effect below,
  // which is what actually clears `interaction` once that prop update lands.
  const pendingClearSeq = useRef<number | null>(null)

  const commitMove = (seq: number, id: string, x: number, y: number) => {
    pendingClearSeq.current = seq
    onMoveObject(id, x, y)
  }
  const commitMoveArrow = (seq: number, id: string, dx: number, dy: number) => {
    pendingClearSeq.current = seq
    onMoveArrow(id, dx, dy)
  }
  const commitRotate = (seq: number, id: string, rotation: number) => {
    pendingClearSeq.current = seq
    onRotateObject(id, rotation)
  }
  const commitScale = (seq: number, id: string, scale: number) => {
    pendingClearSeq.current = seq
    onScaleObject(id, scale)
  }
  const commitResize = (seq: number, id: string, width: number, height: number) => {
    pendingClearSeq.current = seq
    onResizeObject(id, width, height)
  }

  // Fires once `objects`/`arrows` actually reflect the pending commit (i.e. after the store
  // update has propagated back through React), so the live-drag transform can hand off to the
  // committed-prop transform with no frame in between showing the pre-drag position.
  useEffect(() => {
    if (pendingClearSeq.current !== null && interaction.value.seq === pendingClearSeq.current) {
      interaction.value = IDLE_STATE
      pendingClearSeq.current = null
      setIsInteracting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, arrows])

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onBegin((event) => {
      // Every gesture lifecycle gets its own seq so a commit's deferred interaction-clear (see
      // the useEffect above) can tell "the commit I'm waiting on landed" apart from "a new
      // gesture already started since."
      interactionSeq.value += 1
      const seq = interactionSeq.value

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
          interaction.value = { ...IDLE_STATE, seq, mode: 'rotate', targetId: object.id, targetKind: 'object', rotation: object.rotation }
          runOnJS(beginInteracting)()
          return
        }

        const scaleHandle = rotatePointAround({ x: halfW, y: halfH }, object.rotation, cx, cy)
        if (Math.hypot(event.x - scaleHandle.x, event.y - scaleHandle.y) <= HANDLE_HIT_RADIUS) {
          targetCenter.value = { x: cx, y: cy }
          if (object.type === 'zone') {
            // Rectangles resize width/height independently rather than through the shared
            // uniform `scale` multiplier every other object uses (see canvasStore's
            // resizeObject and CanvasObject.tsx's zone rendering).
            resizeRotationRef.value = object.rotation
            interaction.value = {
              ...IDLE_STATE,
              seq,
              mode: 'resize',
              targetId: object.id,
              targetKind: 'object',
              resizeWidth: footprint.width * object.scale,
              resizeHeight: footprint.height * object.scale,
            }
          } else {
            targetScaleRef.value = Math.hypot(footprint.width / 2, footprint.height / 2)
            interaction.value = { ...IDLE_STATE, seq, mode: 'scale', targetId: object.id, targetKind: 'object', scale: object.scale }
          }
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
          interaction.value = { ...IDLE_STATE, seq, mode: 'move', targetId: object.id, targetKind: 'object' }
          runOnJS(onSelect)(object.id)
          runOnJS(beginInteracting)()
          return
        }
      }

      for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i]
        if (object.type === 'player') continue
        // Zone/circle-zone hit-test against their whole fill area (see isPointInObjectHit), not
        // a small radius like equipment — appropriate for tap-to-select, but it would otherwise
        // also swallow a touch-down meant to place a *different* object or start a new shape
        // drag anywhere inside an existing zone, which defeats a zone's whole purpose (marking
        // out an area other equipment gets placed into). Only let a zone intercept the touch
        // while actually in select mode.
        if ((object.type === 'zone' || object.type === 'circle-zone') && tool.kind !== 'select') continue
        if (isPointInObjectHit(object, event.x, event.y, canvasSize)) {
          const px = object.x * canvasSize.width
          const py = object.y * canvasSize.height
          startObjectPoint.value = { x: px, y: py }
          interaction.value = { ...IDLE_STATE, seq, mode: 'move', targetId: object.id, targetKind: 'object' }
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
          interaction.value = { ...IDLE_STATE, seq, mode: 'move', targetId: arrow.id, targetKind: 'arrow' }
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
      } else if (tool.kind === 'place' && (tool.type === 'shape-rect' || tool.type === 'shape-circle')) {
        // Rectangle/circle placement is a click-drag-release gesture, like drawing an arrow —
        // touch-down arms the live preview at a zero-size start, onUpdate grows it live, onEnd
        // commits using the two endpoints. See ShapePlacePreview for the live-preview render.
        interaction.value = {
          ...IDLE_STATE,
          mode: 'placeShape',
          placeShapeType: tool.type,
          drawStart: { x: event.x, y: event.y },
          drawCurrent: { x: event.x, y: event.y },
        }
        runOnJS(beginInteracting)()
      } else if (tool.kind === 'place') {
        // Fire on touch-down, same as the object-selection branches above, rather than waiting
        // for onEnd: a Pan gesture's onEnd is not reliably called for a near-instantaneous tap
        // (no intermediate touch-moved sample for the recognizer to latch onto), which is what
        // made placement silently require a held-down "long press" to register. Selection above
        // never had this problem because it already commits from onBegin.
        if (canvasSize.width > 0 && canvasSize.height > 0) {
          const nx = event.x / canvasSize.width
          const ny = event.y / canvasSize.height
          runOnJS(onPlace)(tool.type, nx, ny)
        }
      } else if (tool.kind === 'select') {
        runOnJS(onSelect)(null)
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
      } else if (current.mode === 'resize') {
        // Project the drag point into the object's local (unrotated) axes — inverse of
        // rotatePointAround — so a rotated rectangle's width/height still track the finger
        // along its own edges rather than the screen's.
        const rotation = resizeRotationRef.value
        const cos = Math.cos(rotation)
        const sin = Math.sin(rotation)
        const dx = event.x - targetCenter.value.x
        const dy = event.y - targetCenter.value.y
        const localX = dx * cos + dy * sin
        const localY = -dx * sin + dy * cos
        interaction.value = {
          ...current,
          resizeWidth: Math.max(MIN_ZONE_SIZE_PX, Math.abs(localX) * 2),
          resizeHeight: Math.max(MIN_ZONE_SIZE_PX, Math.abs(localY) * 2),
        }
      } else if (current.mode === 'drawArrow' || current.mode === 'placeShape') {
        interaction.value = { ...current, drawCurrent: { x: event.x, y: event.y } }
      }
    })
    .onEnd((event) => {
      const current = interaction.value
      const travel = Math.hypot(event.translationX, event.translationY)
      // Set true for move/rotate/scale/resize commits — those leave `interaction` frozen at its
      // final value instead of resetting here, so the render keeps showing the live (correct)
      // position until the committed objects/arrows props land and the effect above clears it.
      // Without this, resetting synchronously here makes the transform fall back to the
      // still-stale `object.x/y` prop for a frame, which is the flicker back to the pre-drag
      // position that this whole seq/effect mechanism exists to avoid.
      let deferClear = false

      // A near-zero-travel "move" is really just the selection tap from onBegin — skip the
      // commit so tapping an object to select it doesn't push a no-op entry onto undo history.
      if (current.mode === 'move' && current.targetId && travel >= TAP_SLOP) {
        if (current.targetKind === 'object' && canvasSize.width > 0 && canvasSize.height > 0) {
          const finalX = (startObjectPoint.value.x + event.translationX) / canvasSize.width
          const finalY = (startObjectPoint.value.y + event.translationY) / canvasSize.height
          runOnJS(commitMove)(current.seq, current.targetId, Math.min(1, Math.max(0, finalX)), Math.min(1, Math.max(0, finalY)))
          deferClear = true
        } else if (current.targetKind === 'arrow' && canvasSize.width > 0 && canvasSize.height > 0) {
          runOnJS(commitMoveArrow)(
            current.seq,
            current.targetId,
            event.translationX / canvasSize.width,
            event.translationY / canvasSize.height
          )
          deferClear = true
        }
      } else if (current.mode === 'rotate' && current.targetId && travel >= TAP_SLOP) {
        runOnJS(commitRotate)(current.seq, current.targetId, current.rotation)
        deferClear = true
      } else if (current.mode === 'scale' && current.targetId && travel >= TAP_SLOP) {
        runOnJS(commitScale)(current.seq, current.targetId, current.scale)
        deferClear = true
      } else if (current.mode === 'resize' && current.targetId && travel >= TAP_SLOP) {
        if (canvasSize.width > 0 && canvasSize.height > 0) {
          runOnJS(commitResize)(current.seq, current.targetId, current.resizeWidth / canvasSize.width, current.resizeHeight / canvasSize.height)
          deferClear = true
        }
      } else if (current.mode === 'drawArrow' && current.drawType) {
        if (travel >= MIN_ARROW_LENGTH && canvasSize.width > 0 && canvasSize.height > 0) {
          const start = { x: current.drawStart.x / canvasSize.width, y: current.drawStart.y / canvasSize.height }
          const end = { x: event.x / canvasSize.width, y: event.y / canvasSize.height }
          const cp1 = { x: start.x + (end.x - start.x) / 3, y: start.y + (end.y - start.y) / 3 }
          const cp2 = { x: start.x + ((end.x - start.x) * 2) / 3, y: start.y + ((end.y - start.y) * 2) / 3 }
          runOnJS(onDrawArrow)(current.drawType, [start, cp1, cp2, end])
        }
      } else if (current.mode === 'placeShape' && current.placeShapeType) {
        if (travel >= MIN_ARROW_LENGTH && canvasSize.width > 0 && canvasSize.height > 0) {
          const p1 = { x: current.drawStart.x / canvasSize.width, y: current.drawStart.y / canvasSize.height }
          const p2 = { x: event.x / canvasSize.width, y: event.y / canvasSize.height }
          runOnJS(onPlaceShape)(current.placeShapeType, p1, p2)
        }
      }
      // mode === 'idle' (place/deselect on empty canvas) is handled in onBegin, not here — see
      // the comment there for why onEnd can't be trusted to fire for a quick tap.

      if (!deferClear) {
        interaction.value = IDLE_STATE
        runOnJS(endInteracting)()
      }
    })
    .onFinalize((_event, success) => {
      if (!success) {
        interaction.value = IDLE_STATE
        runOnJS(endInteracting)()
      }
    })

  return { pan, interaction, isInteracting }
}
