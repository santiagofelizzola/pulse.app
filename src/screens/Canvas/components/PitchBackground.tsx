import { useMemo } from 'react'
import { Path, Rect, Skia, type SkPath } from '@shopify/react-native-skia'

import { canvas } from '../../../theme/theme'
import type { CanvasBackground } from '../../../types'
import { PITCH_STYLES, type PitchStyleValue } from '../../../utils/pitchStyles'

interface PitchBackgroundProps {
  background: CanvasBackground
  width: number
  height: number
  margin?: number
  // The pitch SURFACE (bands + marking color). Geometry comes from `background`; this only
  // decides what the surface and lines are painted with. Defaults to the white pitch, so callers
  // that don't care render exactly as before.
  style?: PitchStyleValue
}

// Proportional pitch-marking geometry (fractions of the drawable play area),
// derived from real pitch dimensions but fit to a portrait phone canvas rather
// than the real 105x68 aspect ratio. Vertical orientation: goal(s) at top/bottom.
const DEFAULT_MARGIN = 20
const BOX_WIDTH_FRAC = 0.6
const SIX_YARD_WIDTH_FRAC = 0.27
const CENTER_CIRCLE_RADIUS_FRAC = 0.135
const CORNER_ARC_RADIUS = 10
const SPOT_RADIUS = 3
// How tightly the penalty-box background zooms in — box width as a fraction of the frame,
// vs. BOX_WIDTH_FRAC's pitch-width-relative fraction used everywhere else.
const PENALTY_BOX_ZOOM_WIDTH_FRAC = 0.9
// Box depth as a fraction of the zoomed frame's height. Lower = more breathing room around the
// box (taller frame for the same width), not just enough to avoid clipping the arc.
const PENALTY_BOX_ZOOM_DEPTH_FRAC = 0.45
// How much of a cropped frame's height its actual pitch-length content fills, for half-pitch and
// the third-of-pitch crops — the rest is margin/context rather than the content running edge to
// edge, which read as overly squat. Lower = taller frame, more breathing room.
const HALF_PITCH_FILL_FRAC = 0.75
const THIRD_FILL_FRAC = 0.65

// Real pitch dimensions (yards) — the single source of truth every ratio below is derived from.
const PITCH_WIDTH_YD = 68
const PITCH_LENGTH_YD = 105
const PENALTY_WIDTH_YD = 44
const PENALTY_DEPTH_YD = 18
const SIX_YARD_WIDTH_YD = 20
const SIX_YARD_DEPTH_YD = 6
const PENALTY_SPOT_YD = 12
const ARC_RADIUS_YD = 10

// addGoalBox's proportions below (six-yard box, spot, arc) are all expressed relative to the
// box's OWN width rather than to playHeight. A pitch's real length is what varies between crops
// (full pitch vs. half vs. a third vs. a zoomed box) while its width does not, so anchoring
// depth to width keeps the box's shape correct no matter how much of the pitch's length a given
// background actually shows — a fraction of playHeight only happened to look right for the one
// crop (full-pitch) whose playHeight really does represent the full pitch length.
const BOX_DEPTH_TO_WIDTH = PENALTY_DEPTH_YD / PENALTY_WIDTH_YD
const SIX_YARD_DEPTH_TO_WIDTH = SIX_YARD_DEPTH_YD / SIX_YARD_WIDTH_YD
const PENALTY_SPOT_TO_DEPTH = PENALTY_SPOT_YD / PENALTY_DEPTH_YD
// The penalty arc uses the same 10yd radius as the center circle.
const ARC_RADIUS_TO_WIDTH = ARC_RADIUS_YD / PENALTY_WIDTH_YD

// How much of the real pitch's length each background actually shows, so the canvas frame
// itself (not just the markings drawn inside it) is proportioned to match — a half-pitch crop
// should be roughly half as tall (for the same width) as a full pitch, not stretched into the
// same tall frame with empty grass below. Width is always the full 68yd pitch width except for
// the zoomed penalty-box crop, which also zooms in horizontally.
export function getPitchAspectRatio(background: CanvasBackground): number {
  switch (background) {
    case 'half-pitch':
      return PITCH_WIDTH_YD / (PITCH_LENGTH_YD / 2 / HALF_PITCH_FILL_FRAC)
    case 'final-third':
    case 'middle-third':
      return PITCH_WIDTH_YD / (PITCH_LENGTH_YD / 3 / THIRD_FILL_FRAC)
    case 'penalty-box': {
      // The box's own depth (18yd) is already locked to its width by BOX_DEPTH_TO_WIDTH,
      // independent of how much the frame zooms in — so the frame's real height just needs to
      // fit that fixed 18yd depth at the target PENALTY_BOX_ZOOM_DEPTH_FRAC.
      const frameWidthYd = PENALTY_WIDTH_YD / PENALTY_BOX_ZOOM_WIDTH_FRAC
      const frameHeightYd = PENALTY_DEPTH_YD / PENALTY_BOX_ZOOM_DEPTH_FRAC
      return frameWidthYd / frameHeightYd
    }
    case 'full-pitch':
    case 'blank':
    default:
      return canvas.pitchAspectRatio
  }
}

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
  facing: 'down' | 'up',
  widthFrac: number = BOX_WIDTH_FRAC
) {
  const boxW = playWidth * widthFrac
  const boxD = boxW * BOX_DEPTH_TO_WIDTH
  const sixW = playWidth * SIX_YARD_WIDTH_FRAC
  const sixD = sixW * SIX_YARD_DEPTH_TO_WIDTH
  const spotOffset = boxD * PENALTY_SPOT_TO_DEPTH
  const arcR = boxW * ARC_RADIUS_TO_WIDTH

  const boxY = facing === 'down' ? edgeY : edgeY - boxD
  const sixY = facing === 'down' ? edgeY : edgeY - sixD
  const spotY = facing === 'down' ? edgeY + spotOffset : edgeY - spotOffset
  const chordY = facing === 'down' ? edgeY + boxD : edgeY - boxD

  path.addRect({ x: cx - boxW / 2, y: boxY, width: boxW, height: boxD })
  path.addRect({ x: cx - sixW / 2, y: sixY, width: sixW, height: sixD })
  path.addCircle(cx, spotY, SPOT_RADIUS)
  path.addPath(boxArc(cx, spotY, arcR, chordY))
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
    addGoalBox(path, cx, top, playWidth, 'down')
    addGoalBox(path, cx, bottom, playWidth, 'up')

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
    // Halfway line sits at the bottom edge, with the center circle's own center resting exactly
    // on it — so only the top (attacking-half) semicircle is drawn, bulging up into the frame,
    // plus the center spot that a plain halfway-line-with-arc treatment otherwise lacks.
    path.moveTo(left, bottom)
    path.lineTo(right, bottom)
    path.addArc({ x: cx - circleR, y: bottom - circleR, width: circleR * 2, height: circleR * 2 }, 180, 180)
    path.addCircle(cx, bottom, SPOT_RADIUS)
    addGoalBox(path, cx, top, playWidth, 'down')
  } else if (background === 'final-third') {
    addGoalBox(path, cx, top, playWidth, 'down')
  } else if (background === 'middle-third') {
    const midY = top + playHeight / 2
    path.moveTo(left, midY)
    path.lineTo(right, midY)
    path.addCircle(cx, midY, circleR)
    path.addCircle(cx, midY, SPOT_RADIUS)
  } else if (background === 'penalty-box') {
    // Zoomed crop: the box fills most of the frame's width (rather than the pitch-width-relative
    // fraction used elsewhere) with everything else — six-yard box, spot, arc — scaled off of
    // that same width via addGoalBox, so the box keeps realistic proportions instead of the
    // previous hand-rolled numbers that sized depth off playHeight and left a mis-placed arc.
    addGoalBox(path, cx, top, playWidth, 'down', PENALTY_BOX_ZOOM_WIDTH_FRAC)
  }

  return path
}

// Half-pixel bleed on each overlay band. Bands land on fractional y offsets (height rarely divides
// evenly), and antialiasing along a shared fractional edge leaks a hairline of the base color;
// overlapping the neighbouring rows by a sub-pixel hides it.
const BAND_BLEED = 0.5

interface Band {
  y: number
  height: number
  color: string
}

// Every band above the base fill, top to bottom. The base fill (bands[0]) is drawn full-bleed
// underneath, so the rows that would repeat it are skipped rather than painted over it.
function buildBands(height: number, style: PitchStyleValue): Band[] {
  if (!style.striped || style.bands.length < 2) return []

  const count = Math.max(Math.round(style.bandCount ?? canvas.pitch.bandCount), 1)
  const bands: Band[] = []

  for (let i = 1; i < count; i += 1) {
    const colorIndex = i % style.bands.length
    if (colorIndex === 0) continue // already covered by the base fill
    const top = (i * height) / count
    const bottom = ((i + 1) * height) / count
    const y = Math.max(top - BAND_BLEED, 0)
    bands.push({ y, height: Math.min(bottom + BAND_BLEED, height) - y, color: style.bands[colorIndex] })
  }

  return bands
}

export function PitchBackground({
  background,
  width,
  height,
  margin = DEFAULT_MARGIN,
  style = PITCH_STYLES.white,
}: PitchBackgroundProps) {
  const path = useMemo(() => buildPitchPath(background, width, height, margin), [background, width, height, margin])
  // Bands run the full frame, not just the play area inside `margin` — real mowing carries on
  // past the touchline.
  const bands = useMemo(() => buildBands(height, style), [height, style])

  if (width === 0 || height === 0) return null

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} color={style.bands[0]} />
      {bands.map((band) => (
        <Rect key={band.y} x={0} y={band.y} width={width} height={band.height} color={band.color} />
      ))}
      {path ? (
        <Path
          path={path}
          color={style.lineColor}
          style="stroke"
          strokeWidth={canvas.pitchLine.width}
          strokeCap="round"
          strokeJoin="round"
        />
      ) : null}
    </>
  )
}
