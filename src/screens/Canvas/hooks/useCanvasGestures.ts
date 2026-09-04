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
  ROTATE_HANDLE_GAP,
  rotatePointAround,
  TAP_SLOP,
} from '../../../utils/canvasUtils'
import type { CanvasTool, PlaceableToolType, SelectedItem, ShapeToolType } from '../../../store/canvasStore'
import type { Arrow, ArrowType, PlacedObject } from '../../../types'

// Rotation is the only transform left on a placed object: scaling and rectangle resizing were
// removed along with their handles, so an object's size is fixed once it lands on the canvas.
// The `scale` field on BaseCanvasObject and Zone's width/height are untouched — every saved
// drill still RENDERS from them, there is simply no longer a gesture that writes them.
export type InteractionMode = 'idle' | 'move' | 'rotate' | 'drawArrow' | 'placeShape'

export interface InteractionState {
  mode: InteractionMode
  targetId: string | null
  targetKind: 'object' | 'arrow' | null
  dx: number
  dy: number
  rotation: number
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
  // Bumped every onBegin. A commit (move/rotate) freezes `interaction` at its
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
  // Still mirrored even though no gesture writes it any more: it is what every already-scaled
  // object in the library renders from, so dropping it here would flatten them all to 1.
  scale: number
  // Zone (rectangle) only — its footprint is stored as width/height rather than as a `scale`
  // multiplier. Left at 0 for every other type, which never reads these.
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

// Exported so a non-interactive renderer (the export templates' CanvasDiagram) can hand
// CanvasObject/ArrowPath/PlayerMarkerOverlay inert shared values and get a purely static
// render out of the exact same components the editor uses — an empty snapshot makes each of
// them fall back to its `object`/`arrow` prop, which is already the first-mount path.
export const EMPTY_SNAPSHOT: CommittedSnapshot = { objects: {}, arrows: {} }

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

// Exported alongside EMPTY_SNAPSHOT above, for the same reason: `mode: 'idle'` + a null
// targetId is exactly "no gesture in flight", which is what a static export render needs.
export const IDLE_STATE: InteractionState = {
  mode: 'idle',
  targetId: null,
  targetKind: null,
  dx: 0,
  dy: 0,
  rotation: 0,
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
// tap rather than a real arrow/shape. Measured, like TAP_SLOP, on raw travel from the touch-down
// point — these two branches always built their geometry from the raw `event.x/y` while gating on
// the rebased translation, so a slow arrow could be drawn and then discarded for being "too
// short" when it wasn't. Same origin now for the gate and the geometry.
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
  onPlaceShape,
  onDrawArrow,
  onMoveArrow,
}: UseCanvasGesturesArgs) {
  const interaction = useSharedValue<InteractionState>(IDLE_STATE)
  const committed = useSharedValue<CommittedSnapshot>(EMPTY_SNAPSHOT)
  const startObjectPoint = useSharedValue({ x: 0, y: 0 })
  // Raw touch-down point (screen px, same frame as onBegin's event.x/y), captured every
  // onBegin regardless of what gets hit. Every distance in this gesture is measured from it —
  // it is the one origin the Pan recognizer never rebases. See onUpdate for why that matters.
  const touchDownPoint = useSharedValue({ x: 0, y: 0 })
  // THE tap-vs-drag verdict for the whole gesture. Latches true the moment travel from
  // touch-down first clears TAP_SLOP, never unlatches, and is reset only in onBegin.
  //
  // Read by all three of onUpdate (paint), onTouchesUp (select) and onEnd (commit), because the
  // question has to be answered ONCE. It used to be latched here for painting and then asked
  // again from the final position by the other two, which disagreed whenever a drag went out and
  // came back: measured on device, a finger that travelled 24.5pt out and returned to 5.0pt of
  // touch-down painted the object all the way out (drag), then onTouchesUp re-read the endpoint
  // as a tap, reset to idle and selected — and the object snapped home. A gesture that ever
  // became a drag stays a drag, and commits wherever the finger actually left it.
  const dragQualified = useSharedValue(false)
  const targetCenter = useSharedValue({ x: 0, y: 0 })
  const interactionSeq = useSharedValue(0)
  // JS-thread mirror of "is a gesture live right now" — SelectionOverlay hides while true so it
  // never lags the worklet-driven live preview (design.md §10: reposition, don't jump).
  const [isInteracting, setIsInteracting] = useState(false)

  const beginInteracting = () => setIsInteracting(true)
  const endInteracting = () => setIsInteracting(false)

  // ---------------------------------------------------------------------------------------
  // TEMPORARY — drag diagnostics, kept for ONE round to confirm the fix on device. Delete this
  // block and its `// DIAG`-marked call sites afterwards. It writes nothing and changes no
  // behaviour; it only records what each gesture measured, and prints one line per gesture.
  //
  // It was added to answer: why does a short drag move an object and then leave it where it
  // started? The reading said the three distance gates did not share an origin. onUpdate and
  // onEnd measured `event.translationX/Y`, which RNGH rebases to zero the moment the recognizer
  // activates — iOS sets `minDistSq = 0` from `.minDistance(0)`, which makes
  // `_hasCustomActivationCriteria` true, so the first touchesMoved fires
  // `setTranslation:CGPointZero` (RNPanHandler.m); Android's `activate()` calls
  // `resetProgress()`, i.e. `startX = lastX` (PanGestureHandler.kt). onTouchesUp instead
  // measured from `touchDownPoint`, which is never rebased.
  //
  // Measured: the discarded offset ran 1.7-29.1pt (median 10.6) on device, so objects committed
  // 46-73% of the finger's travel and anything under `8 + offset` of travel did nothing at all.
  // onUpdate and onEnd now measure from `touchDownPoint` too; these counters stay one more round
  // so `rebase` can be seen still happening while no longer reaching anything.
  // ---------------------------------------------------------------------------------------
  const dbgBeginCount = useSharedValue(0)
  const dbgMode = useSharedValue('')
  const dbgFirstUpdateTranslation = useSharedValue(-1)
  const dbgPeakTranslation = useSharedValue(0)
  const dbgPeakRaw = useSharedValue(0)
  const dbgQualified = useSharedValue(false)
  const dbgTouchesUpRaw = useSharedValue(-1)
  const dbgTouchesUpSelected = useSharedValue(false)
  const dbgEndTranslation = useSharedValue(-1)
  const dbgEndRaw = useSharedValue(-1)
  const dbgEndBranch = useSharedValue('none')

  const logGesture = (line: string) => {
    // eslint-disable-next-line no-console
    console.log(line)
  }

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
      dragQualified.value = false

      // DIAG — counted, not reset, so two onBegins inside one physical touch show up as
      // begins=2 on a single log line (the standing hypothesis for the deselect-also-places bug).
      dbgBeginCount.value += 1
      dbgFirstUpdateTranslation.value = -1
      dbgPeakTranslation.value = 0
      dbgPeakRaw.value = 0
      dbgQualified.value = false
      dbgTouchesUpRaw.value = -1
      dbgTouchesUpSelected.value = false
      dbgEndTranslation.value = -1
      dbgEndRaw.value = -1
      dbgEndBranch.value = 'none'

      // Every gesture lifecycle gets its own seq so a commit's deferred interaction-clear (see
      // the useEffect above) can tell "the commit I'm waiting on landed" apart from "a new
      // gesture already started since."
      interactionSeq.value += 1
      const seq = interactionSeq.value

      // The rotate handle on the current selection takes priority over anything else. `selected`
      // is only ever non-null while tool.kind === 'select' (place/draw tools clear it on arming),
      // so this is a no-op while a placement/draw tool is active.
      //
      // Rotation is the only handle left: the scale handle (and the rectangle-resize branch it
      // forked into) was removed, so a placed object's size is fixed. `object.scale` is still
      // read here because an already-scaled object's handle has to sit on its ACTUAL footprint.
      if (selected && selected.kind === 'object') {
        const object = selected.object
        const cx = object.x * canvasSize.width
        const cy = object.y * canvasSize.height
        const footprint = getObjectFootprint(object, canvasSize)
        const halfH = (footprint.height * object.scale) / 2

        const rotateHandle = rotatePointAround({ x: 0, y: -halfH - ROTATE_HANDLE_GAP }, object.rotation, cx, cy)
        if (Math.hypot(event.x - rotateHandle.x, event.y - rotateHandle.y) <= HANDLE_HIT_RADIUS) {
          targetCenter.value = { x: cx, y: cy }
          interaction.value = { ...IDLE_STATE, seq, mode: 'rotate', targetId: object.id, targetKind: 'object', rotation: object.rotation }
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
      } else if (tool.kind === 'place' && tool.type === 'shape-rect') {
        // Rectangle placement is a click-drag-release gesture, like drawing an arrow —
        // touch-down arms the live preview at a zero-size start, onUpdate grows it live, onEnd
        // commits using the two corners. See ShapePlacePreview for the live-preview render.
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
      // DIAG — recorded before the slop gate below, so a gesture that never qualifies is still
      // measured. `beginToFirstUpdate` is the activation rebase: raw travel already spent by the
      // time translation restarted at zero.
      {
        const translation = Math.hypot(event.translationX, event.translationY)
        const raw = Math.hypot(event.x - touchDownPoint.value.x, event.y - touchDownPoint.value.y)
        if (dbgFirstUpdateTranslation.value < 0) dbgFirstUpdateTranslation.value = raw - translation
        if (translation > dbgPeakTranslation.value) dbgPeakTranslation.value = translation
        if (raw > dbgPeakRaw.value) dbgPeakRaw.value = raw
      }

      // The drag delta is measured from `touchDownPoint`, NOT from event.translationX/Y.
      //
      // This is the whole fix for the short-drag snap-back, and it is not a micro-optimisation:
      // RNGH zeroes translation the instant the recognizer activates — iOS takes `.minDistance(0)`
      // as `minDistSq = 0`, which makes `_hasCustomActivationCriteria` true, so the FIRST
      // touchesMoved fires `setTranslation:CGPointZero` (RNPanHandler.m); Android's `activate()`
      // calls `resetProgress()`, i.e. `startX = lastX` (PanGestureHandler.kt). Whatever the finger
      // covered in that first sample is discarded and never comes back, so `translation` is short
      // by a fixed offset for the REST of the gesture.
      //
      // Measured on device: that offset ran 1.7-29.1pt, median 10.6. Since it is constant per
      // gesture, a 480pt drag lost 3% (invisible) while a 29pt drag lost half — the object
      // committed 46-73% of the distance the finger actually travelled, and anything under
      // `8 + offset` of real travel cleared neither this gate nor onEnd's, so it painted nothing,
      // selected nothing and committed nothing. That is the snap-back.
      //
      // `touchDownPoint` is captured in onBegin and is never rebased, so it is the one origin all
      // three gates can agree on — onTouchesUp already measured tap-vs-drag against it. One
      // quantity, one origin, one threshold: no dead band between "tap" and "drag", and the object
      // tracks the finger exactly.
      const rawDx = event.x - touchDownPoint.value.x
      const rawDy = event.y - touchDownPoint.value.y

      // Latched rather than re-tested per frame so a drag that wanders back inside the slop keeps
      // tracking the finger instead of freezing.
      if (!dragQualified.value) {
        if (Math.hypot(rawDx, rawDy) < TAP_SLOP) return
        dragQualified.value = true
        dbgQualified.value = true // DIAG — true means the object actually painted under the finger
      }

      const current = interaction.value
      if (current.mode === 'move') {
        interaction.value = { ...current, dx: rawDx, dy: rawDy }
      } else if (current.mode === 'rotate') {
        const angle = Math.atan2(event.y - targetCenter.value.y, event.x - targetCenter.value.x)
        interaction.value = { ...current, rotation: angle + Math.PI / 2 }
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
      // selection is decided here instead of onEnd.
      //
      // `dragQualified` is checked FIRST, and the distance test only settles a gesture that never
      // qualified. Without that, an out-and-back drag — out past the slop, then home again before
      // lifting — reads as a tap here, gets reset to idle, and snaps the object back from wherever
      // it was painted. See dragQualified's own note above.
      const current = interaction.value
      // DIAG — recorded for every touch lift, including the ones that return early below, so a
      // gesture that reached neither the select branch nor a commit is still visible in the log.
      dbgMode.value = current.mode
      if (current.mode !== 'move' || !current.targetId) return
      const touch = event.changedTouches[0]
      if (!touch) return
      const travel = Math.hypot(touch.x - touchDownPoint.value.x, touch.y - touchDownPoint.value.y)
      dbgTouchesUpRaw.value = travel // DIAG
      if (!dragQualified.value && travel < TAP_SLOP) {
        dbgTouchesUpSelected.value = true // DIAG
        interaction.value = IDLE_STATE
        runOnJS(onSelect)(current.targetId)
        runOnJS(endInteracting)()
      }
    })
    .onEnd((event) => {
      const current = interaction.value
      // Same origin as onUpdate's gate and onTouchesUp's — see the long note in onUpdate. The
      // move and arrow commits are computed FROM this, so the position that lands in the store is
      // the position the finger actually finished at.
      const rawDx = event.x - touchDownPoint.value.x
      const rawDy = event.y - touchDownPoint.value.y
      // Only the draw/place branches gate on this distance now; move and rotate defer to
      // `dragQualified`. MIN_ARROW_LENGTH asks a different question from TAP_SLOP — not "was this
      // a drag or a tap" but "is this arrow long enough to be worth creating" — so it stays a
      // measurement of the finished gesture rather than a latch.
      const travel = Math.hypot(rawDx, rawDy)
      // DIAG — endRaw is now what gates and commits the drag; endTrans is the rebased translation
      // that USED to, kept alongside it purely so the shortfall between them stays visible. Before
      // the fix these two diverged by the whole rebase (endRaw 39.7 committing only 18.8); after
      // it, the object should land on endRaw and the shortfall should read as whatever endTrans
      // still lags by — a number that no longer reaches the store.
      dbgEndTranslation.value = Math.hypot(event.translationX, event.translationY)
      dbgEndRaw.value = travel
      // Set true for move/rotate commits — those leave `interaction` frozen at its
      // final value instead of resetting here, so the render keeps showing the live (correct)
      // position until the committed objects/arrows props land and the effect above clears it.
      // Without this, resetting synchronously here makes the transform fall back to the
      // still-stale `object.x/y` prop for a frame, which is the flicker back to the pre-drag
      // position that this whole seq/effect mechanism exists to avoid.
      let deferClear = false

      // Commits on `dragQualified`, the verdict onUpdate latched and onTouchesUp deferred to —
      // not on a fresh distance test. A tap was already handled above (and will have reset
      // `interaction` to idle by the time we get here), so this branch only ever runs for a real
      // drag, and it runs for EVERY real drag: one that wandered back inside the slop before
      // lifting still commits, at whatever point the finger actually left it. The two callbacks
      // therefore partition the whole range with nothing between them and no way to disagree.
      if (current.mode === 'move' && current.targetId && dragQualified.value) {
        dbgEndBranch.value = 'commitMove' // DIAG
        if (current.targetKind === 'object' && canvasSize.width > 0 && canvasSize.height > 0) {
          const finalX = (startObjectPoint.value.x + rawDx) / canvasSize.width
          const finalY = (startObjectPoint.value.y + rawDy) / canvasSize.height
          runOnJS(commitMove)(current.seq, current.targetId, Math.min(1, Math.max(0, finalX)), Math.min(1, Math.max(0, finalY)))
          deferClear = true
        } else if (current.targetKind === 'arrow' && canvasSize.width > 0 && canvasSize.height > 0) {
          runOnJS(commitMoveArrow)(current.seq, current.targetId, rawDx / canvasSize.width, rawDy / canvasSize.height)
          deferClear = true
        }
      } else if (current.mode === 'rotate' && current.targetId && dragQualified.value) {
        // Same verdict as the move commit above — a rotation that swings out and back still
        // committed a rotation, and the handle's final angle is the one the coach chose.
        dbgEndBranch.value = 'commitRotate' // DIAG
        runOnJS(commitRotate)(current.seq, current.targetId, current.rotation)
        deferClear = true
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
      // DIAG — one line per gesture, printed here because onFinalize is the only callback that
      // fires for every outcome (committed, cancelled, or never activated at all).
      //
      // Reading it, now that the drag measures from touch-down:
      //   rebase              still reported, and still 1-30pt — RNGH keeps discarding it. It no
      //                       longer reaches anything: nothing gates or commits on translation.
      //   endRaw              what the finger actually travelled, and what the object now moves
      //   endTrans            the old rebased number, kept only so the gap stays visible.
      //                       endRaw - endTrans should still be roughly `rebase`.
      //   painted=true        expected on every gesture whose endRaw >= 8, and on any that
      //                       reached 8 at some point (peakRaw >= 8) even if it came back
      //   branch=commitMove   expected on EVERY painted=true line now, whatever endRaw ended at
      //   sel=true            expected only on painted=false lines — a gesture that never
      //                       qualified. painted=true with sel=true is the out-and-back snap-back
      //                       and should no longer occur at all.
      //   ok=false            normal for a stationary tap (the pan never activates, onEnd never
      //                       fires); on a moving gesture it would mean a cancellation
      //   begins > 1          two onBegins inside one physical touch — none seen so far
      runOnJS(logGesture)(
        `[drag] begins=${dbgBeginCount.value} mode=${dbgMode.value}` +
          ` rebase=${dbgFirstUpdateTranslation.value.toFixed(1)}` +
          ` peakTrans=${dbgPeakTranslation.value.toFixed(1)} peakRaw=${dbgPeakRaw.value.toFixed(1)}` +
          ` painted=${dbgQualified.value}` +
          ` upRaw=${dbgTouchesUpRaw.value.toFixed(1)} sel=${dbgTouchesUpSelected.value}` +
          ` endTrans=${dbgEndTranslation.value.toFixed(1)} endRaw=${dbgEndRaw.value.toFixed(1)}` +
          ` branch=${dbgEndBranch.value} ok=${success} slop=${TAP_SLOP}`
      )
      dbgBeginCount.value = 0

      if (!success) {
        interaction.value = IDLE_STATE
        runOnJS(endInteracting)()
      }
    })

  return { pan, interaction, committed, isInteracting }
}
