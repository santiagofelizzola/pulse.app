import { useMemo } from 'react'
import { Path, Rect, Skia, type SkPath } from '@shopify/react-native-skia'

import { canvas, colors } from '../../../theme/theme'
import type { CanvasBackground } from '../../../types'

interface PitchBackgroundProps {
  background: CanvasBackground
  width: number
  height: number
  margin?: number
}

// Proportional pitch-marking geometry (fractions of the drawable play area),
// derived from real pitch dimensions but fit to a portrait phone canvas rather
// than the real 105x68 aspect ratio. Vertical orientation: goal(s) at top/bottom.
const DEFAULT_MARGIN = 20
const BOX_DEPTH_FRAC = 0.16
const BOX_WIDTH_FRAC = 0.6
const SIX_YARD_DEPTH_FRAC = 0.055
const SIX_YARD_WIDTH_FRAC = 0.27
const CENTER_CIRCLE_RADIUS_FRAC = 0.135
const PENALTY_SPOT_DEPTH_FRAC = 0.105
const CORNER_ARC_RADIUS = 10
const SPOT_RADIUS = 3

/** Minor arc of the circle (cx,cy,r) cut off by the horizontal line y=chordY — used for the penalty arc. */
function boxArc(cx: number, cy: number, r: number, chordY: number): SkPath {
  const dy = chordY - cy
  const dx = Math.sqrt(Math.max(r * r - dy * dy, 0))
  const angleR = (Math.atan2(dy, dx) * 180) / Math.PI
  const angleL = (Math.atan2(dy, -dx) * 180) / Math.PI
  const path = Skia.Path.Make()
  path.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, angleR, angleL - angleR)
  return path
}

function addGoalBox(
  path: SkPath,
  cx: number,
  edgeY: number,
  playWidth: number,
  playHeight: number,
  facing: 'down' | 'up',
  circleR: number
) {
  const boxW = playWidth * BOX_WIDTH_FRAC
  const boxD = playHeight * BOX_DEPTH_FRAC
  const sixW = playWidth * SIX_YARD_WIDTH_FRAC
  const sixD = playHeight * SIX_YARD_DEPTH_FRAC
  const spotOffset = playHeight * PENALTY_SPOT_DEPTH_FRAC

  const boxY = facing === 'down' ? edgeY : edgeY - boxD
  const sixY = facing === 'down' ? edgeY : edgeY - sixD
  const spotY = facing === 'down' ? edgeY + spotOffset : edgeY - spotOffset
  const chordY = facing === 'down' ? edgeY + boxD : edgeY - boxD

  path.addRect({ x: cx - boxW / 2, y: boxY, width: boxW, height: boxD })
  path.addRect({ x: cx - sixW / 2, y: sixY, width: sixW, height: sixD })
  path.addCircle(cx, spotY, SPOT_RADIUS)
  path.addPath(boxArc(cx, spotY, circleR, chordY))
}

function buildPitchPath(background: CanvasBackground, width: number, height: number, margin: number): SkPath | null {
  if (background === 'blank') return null

  const left = margin
  const right = width - margin
  const top = margin
  const bottom = height - margin
  const playWidth = right - left
  const playHeight = bottom - top
  const cx = left + playWidth / 2
  const circleR = playWidth * CENTER_CIRCLE_RADIUS_FRAC

  const path = Skia.Path.Make()
  path.addRect({ x: left, y: top, width: playWidth, height: playHeight })

  if (background === 'full-pitch') {
    const midY = top + playHeight / 2
    path.moveTo(left, midY)
    path.lineTo(right, midY)
    path.addCircle(cx, midY, circleR)
    path.addCircle(cx, midY, SPOT_RADIUS)
    addGoalBox(path, cx, top, playWidth, playHeight, 'down', circleR)
    addGoalBox(path, cx, bottom, playWidth, playHeight, 'up', circleR)

    const corners: Array<[number, number, number]> = [
      [left, top, 0],
      [right, top, 90],
      [right, bottom, 180],
      [left, bottom, 270],
    ]
    corners.forEach(([x, y, startAngle]) => {
      path.addArc(
        { x: x - CORNER_ARC_RADIUS, y: y - CORNER_ARC_RADIUS, width: CORNER_ARC_RADIUS * 2, height: CORNER_ARC_RADIUS * 2 },
        startAngle,
        90
      )
    })
  } else if (background === 'half-pitch') {
    path.moveTo(left, bottom)
    path.lineTo(right, bottom)
    path.addArc({ x: cx - circleR, y: bottom - circleR, width: circleR * 2, height: circleR * 2 }, 180, 180)
    addGoalBox(path, cx, top, playWidth, playHeight, 'down', circleR)
  } else if (background === 'final-third') {
    addGoalBox(path, cx, top, playWidth, playHeight, 'down', circleR)
  } else if (background === 'middle-third') {
    const midY = top + playHeight / 2
    path.moveTo(left, midY)
    path.lineTo(right, midY)
    path.addCircle(cx, midY, circleR)
    path.addCircle(cx, midY, SPOT_RADIUS)
  } else if (background === 'penalty-box') {
    const boxW = playWidth * 0.95
    const boxD = playHeight * 0.8
    const sixW = playWidth * 0.5
    const sixD = playHeight * 0.32
    const spotY = top + playHeight * 0.42
    const arcR = playWidth * 0.33
    path.addRect({ x: cx - boxW / 2, y: top, width: boxW, height: boxD })
    path.addRect({ x: cx - sixW / 2, y: top, width: sixW, height: sixD })
    path.addCircle(cx, spotY, SPOT_RADIUS + 1)
    path.addPath(boxArc(cx, spotY, arcR, top + boxD))
  }

  return path
}

export function PitchBackground({ background, width, height, margin = DEFAULT_MARGIN }: PitchBackgroundProps) {
  const path = useMemo(() => buildPitchPath(background, width, height, margin), [background, width, height, margin])

  if (width === 0 || height === 0) return null

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} color={colors.background} />
      {path ? (
        <Path
          path={path}
          color={colors.canvasInk}
          style="stroke"
          strokeWidth={canvas.pitchLine.width}
          strokeCap="round"
          strokeJoin="round"
        />
      ) : null}
    </>
  )
}
