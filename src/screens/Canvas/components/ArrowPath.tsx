import { DashPathEffect, Path } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'

import { canvas, colors } from '../../../theme/theme'
import type { Arrow, ArrowType } from '../../../types'
import type { InteractionState } from '../hooks/useCanvasGestures'

const STROKE_WIDTH = canvas.line.strokeWidth
const DOUBLE_GAP = canvas.line.doubleGap
const DASH = canvas.line.dash
const WAVE_AMPLITUDE = canvas.line.waveAmplitude
const WAVE_LENGTH = canvas.line.waveLength
const HEAD_LENGTH = canvas.line.arrowHead.length
const HEAD_WIDTH = canvas.line.arrowHead.width
// Sample density scales with the wave's own wavelength (not a fixed total), otherwise a long
// arrow under-samples each cycle and the wave renders as sharp zigzag facets instead of a
// smooth curve. 16 samples/cycle plus round joins reads as smooth at on-screen line lengths.
const WAVE_SAMPLES_PER_CYCLE = 16
const MIN_WAVE_SAMPLES = 16

type Point = { x: number; y: number }

// This session's arrows are always straight (see useCanvasGestures — drawn end-to-end with
// collinear control points, no reshape handles), so every visual treatment below only needs
// the start/end points, not the full cubic bezier. Kept as plain worklet functions so they're
// shared by both the committed-arrow renderer and the live draw-in-progress preview.

function straightLinePath(a: Point, b: Point): string {
  'worklet'
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}

function offsetPerpendicular(a: Point, b: Point, distance: number): { a: Point; b: Point } {
  'worklet'
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * distance
  const ny = (dx / len) * distance
  return { a: { x: a.x + nx, y: a.y + ny }, b: { x: b.x + nx, y: b.y + ny } }
}

function wavyPath(a: Point, b: Point): string {
  'worklet'
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const samples = Math.max(Math.ceil((len / WAVE_LENGTH) * WAVE_SAMPLES_PER_CYCLE), MIN_WAVE_SAMPLES)
  let d = ''
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples
    const alongX = a.x + ux * len * t
    const alongY = a.y + uy * len * t
    const phase = ((len * t) / WAVE_LENGTH) * Math.PI * 2
    const offset = Math.sin(phase) * WAVE_AMPLITUDE
    const px = alongX + nx * offset
    const py = alongY + ny * offset
    d += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`
  }
  return d
}

// Where the shaft's straight/wavy/double stroke should stop so a solid arrowhead can cover the
// rest — without this, the stroke's round cap pokes a small bump past (or through) the flat
// base of the filled triangle, reading as a seam instead of one continuous arrow.
function recedeEnd(a: Point, b: Point, distance: number): Point {
  'worklet'
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const t = Math.max(0, (len - distance) / len)
  return { x: a.x + dx * t, y: a.y + dy * t }
}

function arrowHeadPath(a: Point, b: Point): string {
  'worklet'
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const baseX = b.x - ux * HEAD_LENGTH
  const baseY = b.y - uy * HEAD_LENGTH
  const leftX = baseX + nx * (HEAD_WIDTH / 2)
  const leftY = baseY + ny * (HEAD_WIDTH / 2)
  const rightX = baseX - nx * (HEAD_WIDTH / 2)
  const rightY = baseY - ny * (HEAD_WIDTH / 2)
  return `M ${b.x} ${b.y} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`
}

interface ArrowPathProps {
  arrow: Arrow
  canvasSize: { width: number; height: number }
  isSelected: boolean
  interaction: SharedValue<InteractionState>
}

export function ArrowPath({ arrow, canvasSize, isSelected, interaction }: ArrowPathProps) {
  const endpoints = useDerivedValue(() => {
    const live = interaction.value
    const isTarget = live.mode === 'move' && live.targetId === arrow.id
    const dx = isTarget ? live.dx : 0
    const dy = isTarget ? live.dy : 0
    const start = arrow.points[0]
    const end = arrow.points[3]
    const startPx = { x: start.x * canvasSize.width + dx, y: start.y * canvasSize.height + dy }
    const endPx = { x: end.x * canvasSize.width + dx, y: end.y * canvasSize.height + dy }
    return { start: startPx, end: endPx, shaftEnd: recedeEnd(startPx, endPx, HEAD_LENGTH) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrow.points, canvasSize.width, canvasSize.height])

  const mainPath = useDerivedValue(() => straightLinePath(endpoints.value.start, endpoints.value.shaftEnd))
  const wavePath = useDerivedValue(() => wavyPath(endpoints.value.start, endpoints.value.shaftEnd))
  const shotPathA = useDerivedValue(() => {
    const { a, b } = offsetPerpendicular(endpoints.value.start, endpoints.value.shaftEnd, -DOUBLE_GAP / 2)
    return straightLinePath(a, b)
  })
  const shotPathB = useDerivedValue(() => {
    const { a, b } = offsetPerpendicular(endpoints.value.start, endpoints.value.shaftEnd, DOUBLE_GAP / 2)
    return straightLinePath(a, b)
  })
  const headPath = useDerivedValue(() => arrowHeadPath(endpoints.value.start, endpoints.value.end))

  const haloWidth = STROKE_WIDTH + 1
  const haloProps = { style: 'stroke' as const, strokeWidth: haloWidth, strokeCap: 'round' as const, strokeJoin: 'round' as const, color: colors.primary }

  return (
    <>
      {/* The halo traces the same shape as the arrow actually renders (straight/double/wavy) —
          a plain straight-line halo under a wavy or double-stroke arrow would visibly miss it
          rather than nesting around it. */}
      {isSelected ? (
        arrow.type === 'shot' ? (
          <>
            <Path path={shotPathA} {...haloProps} />
            <Path path={shotPathB} {...haloProps} />
          </>
        ) : arrow.type === 'dribble' ? (
          <Path path={wavePath} {...haloProps} />
        ) : (
          <Path path={mainPath} {...haloProps} />
        )
      ) : null}

      {arrow.type === 'shot' ? (
        <>
          <Path path={shotPathA} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk} />
          <Path path={shotPathB} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk} />
        </>
      ) : arrow.type === 'dribble' ? (
        <Path path={wavePath} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk} />
      ) : (
        <Path path={mainPath} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk}>
          {arrow.type === 'run' ? <DashPathEffect intervals={[...DASH]} /> : null}
        </Path>
      )}

      <Path path={headPath} style="fill" color={colors.canvasInk} />
    </>
  )
}

interface ArrowDrawPreviewProps {
  type: ArrowType
  interaction: SharedValue<InteractionState>
}

// Live preview while a draw-arrow gesture is in progress (tool armed, finger down but not yet
// released). Reuses the same per-type geometry as the committed ArrowPath above so the preview
// matches exactly what gets saved. Each derived path resolves to '' (renders nothing) whenever
// the gesture isn't actively drawing, so this can stay mounted for the whole time the tool is armed.
export function ArrowDrawPreview({ type, interaction }: ArrowDrawPreviewProps) {
  const shaftEnd = useDerivedValue(() => {
    const live = interaction.value
    return recedeEnd(live.drawStart, live.drawCurrent, HEAD_LENGTH)
  })

  const mainPath = useDerivedValue(() => {
    const live = interaction.value
    if (live.mode !== 'drawArrow') return ''
    return straightLinePath(live.drawStart, shaftEnd.value)
  })
  const wavePath = useDerivedValue(() => {
    const live = interaction.value
    if (live.mode !== 'drawArrow') return ''
    return wavyPath(live.drawStart, shaftEnd.value)
  })
  const shotPathA = useDerivedValue(() => {
    const live = interaction.value
    if (live.mode !== 'drawArrow') return ''
    const { a, b } = offsetPerpendicular(live.drawStart, shaftEnd.value, -DOUBLE_GAP / 2)
    return straightLinePath(a, b)
  })
  const shotPathB = useDerivedValue(() => {
    const live = interaction.value
    if (live.mode !== 'drawArrow') return ''
    const { a, b } = offsetPerpendicular(live.drawStart, shaftEnd.value, DOUBLE_GAP / 2)
    return straightLinePath(a, b)
  })
  const headPath = useDerivedValue(() => {
    const live = interaction.value
    if (live.mode !== 'drawArrow') return ''
    return arrowHeadPath(live.drawStart, live.drawCurrent)
  })

  return (
    <>
      {type === 'shot' ? (
        <>
          <Path path={shotPathA} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk} />
          <Path path={shotPathB} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk} />
        </>
      ) : type === 'dribble' ? (
        <Path path={wavePath} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk} />
      ) : (
        <Path path={mainPath} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={colors.canvasInk}>
          {type === 'run' ? <DashPathEffect intervals={[...DASH]} /> : null}
        </Path>
      )}
      <Path path={headPath} style="fill" color={colors.canvasInk} />
    </>
  )
}
