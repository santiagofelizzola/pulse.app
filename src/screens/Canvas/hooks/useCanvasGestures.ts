import { useEffect, useRef, useState } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS, runOnUI, useSharedValue } from 'react-native-reanimated'

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
  // Pixel-space position captured once at the start of a 'move' drag (the object's own point,
  // or an arrow's start point) — see CanvasObject/ArrowPath/PlayerMarkerOverlay, which add
  // dx/dy onto THIS instead of onto the live `object.x`/`arrow.points` prop. Both startX/Y and
  // dx/dy live in this same frozen struct and clear together, so a render can never combine a
  // just-committed (already-final) prop position with a still-live delta and double-count it —
  // which is what produced the post-drop overshoot-then-snap-back flicker on equipment/zones/
  // arrows (markers happened not to show it, but shared the identical race).
  startX: number
  startY: number
  // Arrow-only: the arrow's end point, frozen the same way as startX/startY's start point —
  // an arrow drag needs to hold both endpoints steady, not just one.
  startEndX: number
  startEndY: number
  // Bumped every onBegin. A commit (move/rotate/scale/resize) freezes `interaction` at its
  // final value instead of resetting to idle in onEnd — the reset waits for the committed
  // objects/arrows props to actually land (see the useEffect below) so the render never has a
  // frame where it falls back to the pre-drag prop position. `seq` lets that effect confirm
  // it's still clearing the gesture it was waiting for, not a newer one that started since.
  seq: number
}

// The committed (post-store) geometry of every object/arrow, mirrored into a shared value.
//
// This exists because CanvasObject/ArrowPath are NOT rendered by this React tree — Skia's
// <Canvas> renders its children through a separate reconciler (sksg/Reconciler.ts), started
// fire-and-forget from a useLayoutEffect and awaited across a microtask inside
// SkiaSGRoot.render. Their useDerivedValue mappers therefore pick up new committed props on a
// schedule this tree cannot order against. Reading the base position from a React prop closure
// meant the base and the live drag delta lived on two different clocks: clear `interaction`
// before the Skia subtree re-commits and the transform falls through to a still-PRE-DRAG
// closure, painting the object back at the drag origin for a few frames.
//
// Mirroring committed geometry here lets the snapshot and the interaction-clear be written in
// ONE runOnUI block (see the effect below), so base and delta update atomically on the UI
// thread and no reconciler ordering can wedge between them. Player markers never showed the bug
// — they live in this tree, where useAnimatedStyle's effect is ordered child-before-parent in
// the same commit — but they read the snapshot too so all three paths stay identical.
export interface CommittedObject {
  x: number
  y: number
  rotation: number
  scale: number
  // Zone (rectangle) only — the one shape resized in width/height rather than via `scale`.
  // Left at 0 for every other type, which never reads these.
  width: number
  height: number
}

export interface CommittedArrow {
  sx: number
  sy: number
  ex: number
  ey: number
}

export interface CommittedSnapshot {
  objects: Record<string, CommittedObject>
  arrows: Record<string, CommittedArrow>
}

const EMPTY_SNAPSHOT: CommittedSnapshot = { objects: {}, arrows: {} }

// Normalized (0..1) coordinates, same units as the store — consumers multiply by canvasSize
// from their own closure, which is stable for a gesture's duration and never races a commit.
function buildSnapshot(objects: PlacedObject[], arrows: Arrow[]): CommittedSnapshot {
  const objectMap: Record<string, CommittedObject> = {}
  for (const object of objects) {
    objectMap[object.id] = {
      x: object.x,
      y: object.y,
      rotation: object.rotation,
      scale: object.scale,
      width: object.type === 'zone' ? object.width : 0,
      height: object.type === 'zone' ? object.height : 0,
    }
  }

  const arrowMap: Record<string, CommittedArrow> = {}
  for (const arrow of arrows) {
    arrowMap[arrow.id] = {
      sx: arrow.points[0].x,
      sy: arrow.points[0].y,
      ex: arrow.points[3].x,
      ey: arrow.points[3].y,
    }
  }

  return { objects: objectMap, arrows: arrowMap }
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
  startX: 0,
  startY: 0,
  startEndX: 0,
  startEndY: 0,
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
  const committed = useSharedValue<CommittedSnapshot>(EMPTY_SNAPSHOT)
  const startObjectPoint = useSharedValue({ x: 0, y: 0 })
  // Raw touch-down point (screen px, same frame as onBegin's event.x/y), captured every
  // onBegin regardless of what gets hit. onTouchesUp uses it to measure tap-vs-drag travel
  // independent of the Pan recognizer's own activation state — see onTouchesUp below for why.
  const touchDownPoint = useSharedValue({ x: 0, y: 0 })
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

  // Mirrors every store change into `committed`, and — when that change is the one a just-ended
  // gesture was waiting on — clears `interaction` in the SAME UI-thread block. Writing both
  // together is the whole point: the live-drag transform hands off to the committed transform
  // as one atomic step, so there is no window where a render can pair an already-final base
  // with a still-live delta, or (the actual bug — see CommittedSnapshot above) a cleared
  // interaction with a stale pre-drag base from Skia's independently-scheduled reconciler.
  useEffect(() => {
    const snapshot = buildSnapshot(objects, arrows)
    const clearSeq = pendingClearSeq.current
    pendingClearSeq.current = null

    runOnUI((nextSnapshot: CommittedSnapshot, seq: number | null) => {
      'worklet'
      committed.value = nextSnapshot
      // Re-checked here rather than on the JS thread because `interaction` is authoritative on
      // the UI thread: a newer gesture may already have begun, and its state must not be
      // stomped by an older commit's clear.
      if (seq !== null && interaction.value.seq === seq) {
        interaction.value = IDLE_STATE
      }
    })(snapshot, clearSeq)

    if (clearSeq !== null && interaction.value.seq === clearSeq) setIsInteracting(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, arrows])

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onBegin((event) => {
      touchDownPoint.value = { x: event.x, y: event.y }

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
          // Selection is decided in onEnd (tap vs. drag, by travel distance) — not here. Firing
          // onSelect eagerly on touch-down is what used to auto-select on every drag, putting
          // rotate/scale handles under the very next touch-down before the user asked for them.
          interaction.value = { ...IDLE_STATE, seq, mode: 'move', targetId: object.id, targetKind: 'object', startX: px, startY: py }
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
          // See the player-marker branch above: selection is decided in onEnd, not on touch-down.
          interaction.value = { ...IDLE_STATE, seq, mode: 'move', targetId: object.id, targetKind: 'object', startX: px, startY: py }
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
          interaction.value = {
            ...IDLE_STATE,
            seq,
            mode: 'move',
            targetId: arrow.id,
            targetKind: 'arrow',
            startX: p0.x,
            startY: p0.y,
            startEndX: p3.x,
            startEndY: p3.y,
          }
          // See the object branches above: selection is decided in onEnd, not on touch-down.
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
    .onTouchesUp((event) => {
      // A Pan gesture only calls onEnd once the recognizer has transitioned to ACTIVE, which a
      // truly stationary touch (zero movement) may never reach — so onEnd can silently never
      // fire for a clean tap (same root cause as the tap-to-place fix in onBegin's 'place'
      // branch: onEnd can't be trusted for a near-instantaneous, low-travel touch). onTouchesUp
      // is the raw touch-lift event and fires regardless of recognizer activation, so tap
      // selection is decided here instead of onEnd. Gated the same way onEnd gates its drag
      // commits (TAP_SLOP) so a real drag — which reliably does activate and reaches onEnd —
      // is left untouched and still never selects.
      const current = interaction.value
      if (current.mode !== 'move' || !current.targetId) return
      const touch = event.changedTouches[0]
      if (!touch) return
      const travel = Math.hypot(touch.x - touchDownPoint.value.x, touch.y - touchDownPoint.value.y)
      if (travel < TAP_SLOP) {
        interaction.value = IDLE_STATE
        runOnJS(onSelect)(current.targetId)
        runOnJS(endInteracting)()
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

      // A near-zero-travel "move" is really just the selection tap already handled by
      // onTouchesUp above (which will have reset `interaction` to idle by the time we get here)
      // — this branch only ever runs for a real drag, gated the same way (TAP_SLOP) so it never
      // double-fires against onTouchesUp's tap case.
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

  return { pan, interaction, committed, isInteracting }
}
