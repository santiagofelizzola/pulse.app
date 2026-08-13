import { useEffect, useMemo, useState } from 'react'
import { Asset } from 'expo-asset'
import { randomUUID } from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import { Skia, type SkSVG } from '@shopify/react-native-skia'

import { canvas, colors } from '../theme/theme'
import type { PlaceableToolType } from '../store/canvasStore'
import type { PlacedObject } from '../types'

// Hit-testing / placement

export const HIT_RADIUS = 24
export const TAP_SLOP = 8

// Selection handles (design.md §7: 20px circles, 44px touch target via hit-slop). Shared
// between the gesture hook (hit-testing, on the UI thread) and SelectionOverlay (rendering,
// on the JS thread) so the drawn handle position always matches where a touch actually lands.
export const ROTATE_HANDLE_GAP = 20
export const HANDLE_HIT_RADIUS = canvas.toolButton / 2
export const SCALE_MIN = 0.5
export const SCALE_MAX = 2.5

// Default cone body color — traffic-cone orange, distinct from the fixed dark base stripe
// baked into cone.svg. (Other equipment still defaults to colors.canvasInk; the cone is the
// one currently-colorable item, so it gets a color worth seeing by default.)
export const CONE_DEFAULT_COLOR = '#EE7110'

// Preset swatches for the selection toolbar's color action (cone/disc, player/lineup markers).
// A small fixed set rather than a full color wheel, per design.md's "simple color picker" allowance.
export const OBJECT_COLOR_SWATCHES = [
  CONE_DEFAULT_COLOR,
  colors.primary,
  colors.error,
  colors.info,
  colors.warning,
  colors.canvasInk,
] as const

// Picks readable label text for an arbitrary marker fill color — a light fill (or none, i.e. the
// default white marker) keeps the usual dark ink text; a dark fill (e.g. the canvasInk or error
// swatches) flips to white instead of going illegible against its own background. Perceived
// brightness (ITU-R BT.601 weights), not a full WCAG contrast ratio — good enough for a fixed,
// known swatch set, and the same logic dark mode's marker-on-dark-surface case will need later.
export function getMarkerTextColor(fillColor: string | undefined): string {
  if (!fillColor) return colors.canvasInk
  const hex = fillColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness < 128 ? colors.textInverse : colors.canvasInk
}

// Default footprint for the two Shapes-tool objects, normalized like Zone/Goal's `width`
// (fraction of canvas width; height fractions are of canvas height).
export const ZONE_DEFAULT_WIDTH = 0.3
export const ZONE_DEFAULT_HEIGHT = 0.2
export const CIRCLE_ZONE_DEFAULT_RADIUS = 0.09

// Floor on a zone's live-resized footprint (screen px) so dragging the corner handle past the
// center can't collapse it to zero/negative size.
export const MIN_ZONE_SIZE_PX = 40

// Equipment SVG assets. The files in assets/icons/ are pre-cleaned and pre-colored (plain
// XML presentation attributes, no DOCTYPE/CSS — see assets/icons/ history for why that matters
// to Skia's SVG parser), so the loader only needs to load them. Cone/Disc recoloring is a
// separate, unrelated mechanism — those are hand-drawn Skia primitives whose `color` field is
// read directly at render time (see CanvasObject.tsx), not part of this SVG pipeline.
// agilityRing.svg is intentionally unused: the disc is drawn as concentric Skia circles per design.md §7.

// Tunable: the ball SVGs' native stroke-width (~0.1 in an ~9-unit viewBox) renders far thinner than
// the 2px marker-border weight at 26px. This value is a starting point, not a final answer —
// soccerBall.svg (many small colored patches) goes muddy well before BWsoccerBall.svg does,
// since every patch's stroke is a dark color that competes with the fill. Adjust to taste.
const BALL_STROKE_MULTIPLIER = 3

// nativeWidth is NOT the raw SVG width prop — each source file has a different viewBox and a
// different amount of empty margin around its actual ink, so identical width numbers render at
// visibly different sizes across assets (confirmed by measuring rendered pixel footprints on
// device, not just trusting the declared viewBox). nativeWidth here is a *calibrated* value
// already correcting for that per-asset content/margin ratio, so that setting the same
// nativeWidth across assets produces the same visual footprint. See CanvasObject.tsx for how
// it's applied (scale = nativeWidth / svg.width(), i.e. against the SVG's own declared size —
// the calibration is baked into the numbers below, not computed at render time).
// Sizing rule (design.md §7): the 30px player marker is the largest thing on the canvas except
// the full Goal, which stays large by design (~1.3-1.5x a marker); everything else — cone, both
// balls, mini-goal — is calibrated to render clearly smaller than a marker (~20-24px).
export const EQUIPMENT_ASSETS = {
  cone: {
    module: require('../../assets/icons/cone.svg') as number,
    thicken: false,
    nativeWidth: 17,
  },
  ladder: {
    module: require('../../assets/icons/ladder.svg') as number,
    thicken: false,
    nativeWidth: canvas.equipment.size,
  },
  goal: {
    module: require('../../assets/icons/soccerGoal.svg') as number,
    thicken: false,
    nativeWidth: 75,
  },
  'mini-goal': {
    module: require('../../assets/icons/miniSoccerGoal.svg') as number,
    thicken: false,
    nativeWidth: 47,
  },
  'ball-bw': {
    module: require('../../assets/icons/BWsoccerBall.svg') as number,
    thicken: true,
    nativeWidth: 17,
  },
  'ball-color': {
    module: require('../../assets/icons/soccerBall.svg') as number,
    thicken: true,
    nativeWidth: 17,
  },
} as const

export type EquipmentAssetKey = keyof typeof EQUIPMENT_ASSETS

// Plain-number mirror of the cone/ball nativeWidth values above, so getObjectFootprint (a
// 'worklet' function called from the gesture's UI-thread worklet — see useCanvasGestures.ts)
// never needs EQUIPMENT_ASSETS itself in its closure. EQUIPMENT_ASSETS carries require()'d SVG
// module references alongside the plain numbers; keeping those out of a worklet closure entirely
// is simple insurance against the asset loader ever doing something a worklet can't clone.
const CONE_FOOTPRINT_WIDTH = EQUIPMENT_ASSETS.cone.nativeWidth
const BALL_FOOTPRINT_WIDTH = {
  bw: EQUIPMENT_ASSETS['ball-bw'].nativeWidth,
  color: EQUIPMENT_ASSETS['ball-color'].nativeWidth,
} as const

function thickenStrokeWidths(svgText: string, multiplier: number): string {
  return svgText.replace(
    /stroke-width="([0-9.]+)"/g,
    (_match, value: string) => `stroke-width="${(parseFloat(value) * multiplier).toFixed(3)}"`
  )
}

// Skia's SVG parser doesn't resolve currentColor (it doesn't do CSS cascade resolution at all —
// see the DOCTYPE/CSS-class history for this file), so a per-object recolor like the cone's
// `fill="currentColor"` body needs the literal text substituted before parsing. react-native-svg
// (used for the palette icon) *does* support currentColor via its own `color` prop, so this is
// only needed for the Skia canvas path.
export function applyCurrentColor(svgText: string, hexColor: string): string {
  return svgText.split('currentColor').join(hexColor)
}

// Raw (processed) SVG text — shared by two consumers: the Skia canvas (parses it into an
// SkSVG) and the tool-palette button icons (rendered as a normal RN view via react-native-svg's
// SvgXml, since palette buttons live outside the Skia <Canvas>). One loader, two renderers.
const svgTextCache = new Map<string, string | null>()
const svgTextLoads = new Map<string, Promise<string | null>>()

async function loadEquipmentSvgText(key: EquipmentAssetKey): Promise<string | null> {
  if (svgTextCache.has(key)) return svgTextCache.get(key) ?? null

  const existing = svgTextLoads.get(key)
  if (existing) return existing

  const promise = (async () => {
    const config = EQUIPMENT_ASSETS[key]
    const asset = Asset.fromModule(config.module)
    await asset.downloadAsync()
    if (!asset.localUri) return null

    const raw = await FileSystem.readAsStringAsync(asset.localUri)
    const processed = config.thicken ? thickenStrokeWidths(raw, BALL_STROKE_MULTIPLIER) : raw
    svgTextCache.set(key, processed)
    return processed
  })()

  svgTextLoads.set(key, promise)
  return promise
}

export function useEquipmentSvgText(key: EquipmentAssetKey): string | null {
  const [text, setText] = useState<string | null>(svgTextCache.get(key) ?? null)

  useEffect(() => {
    let cancelled = false
    loadEquipmentSvgText(key).then((result) => {
      if (!cancelled) setText(result)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return text
}

// Keyed by the exact (already-recolored, if applicable) text, so distinctly-colored instances
// of the same asset (e.g. two cones in different colors) each get their own parsed SkSVG while
// identically-colored instances share one.
const skSvgCache = new Map<string, SkSVG | null>()

function parseEquipmentSvg(text: string): SkSVG | null {
  if (skSvgCache.has(text)) return skSvgCache.get(text) ?? null
  const svg = Skia.SVG.MakeFromString(text)
  skSvgCache.set(text, svg)
  return svg
}

// `recolorHex`, if given, substitutes the asset's `currentColor` placeholders (see
// applyCurrentColor) before parsing — used for per-object-colorable equipment like the cone.
export function useEquipmentSvg(key: EquipmentAssetKey, recolorHex?: string): SkSVG | null {
  const text = useEquipmentSvgText(key)

  return useMemo(() => {
    if (!text) return null
    const finalText = recolorHex ? applyCurrentColor(text, recolorHex) : text
    return parseEquipmentSvg(finalText)
  }, [text, recolorHex])
}

// Default object factory — PlacedObject.x/y/width are normalized 0..1 fractions of the
// canvas so a drill redraws identically on any device (see architecture.md's Lineup
// convention, extended here since BaseCanvasObject didn't specify a coordinate space).

interface CanvasSize {
  width: number
  height: number
}

// Selection / hit-testing geometry
//
// Bounding footprint per object type, in on-screen pixels (not normalized), for the selection
// outline and toolbar/handle positioning. Goal/mini-goal only store a normalized `width`, so
// height is derived from a calibrated aspect constant rather than a stored value.
const GOAL_ASPECT = 0.55
const MINI_GOAL_ASPECT = 0.6

// Geometry helpers below are called both from plain JS (SelectionOverlay) and from inside the
// canvas gesture's UI-thread worklet (useCanvasGestures) for live hit-testing — 'worklet' makes
// them callable from either context via the same implementation.

export function getObjectFootprint(object: PlacedObject, canvasSize: CanvasSize): { width: number; height: number } {
  'worklet'
  switch (object.type) {
    case 'player':
      return { width: canvas.marker.diameter, height: canvas.marker.diameter }
    case 'goal':
      return { width: object.width * canvasSize.width, height: object.width * canvasSize.width * GOAL_ASPECT }
    case 'mini-goal':
      return { width: object.width * canvasSize.width, height: object.width * canvasSize.width * MINI_GOAL_ASPECT }
    case 'zone':
      return { width: object.width * canvasSize.width, height: object.height * canvasSize.height }
    case 'circle-zone': {
      const diameter = object.radius * 2 * canvasSize.width
      return { width: diameter, height: diameter }
    }
    case 'label':
      return { width: canvas.equipment.size, height: canvas.equipment.size }
    case 'cone':
      return { width: CONE_FOOTPRINT_WIDTH, height: CONE_FOOTPRINT_WIDTH }
    case 'ball': {
      const width = object.variant === 'color' ? BALL_FOOTPRINT_WIDTH.color : BALL_FOOTPRINT_WIDTH.bw
      return { width, height: width }
    }
    case 'disc':
    case 'pole':
    case 'ladder':
    case 'flag':
      return { width: canvas.equipment.size, height: canvas.equipment.size }
  }
}

// Point-in-object hit test used for tap-to-select. Equipment/markers/circles use a simple
// footprint-radius circular test (matches their roughly-round on-canvas footprint); 'zone'
// (rectangle) instead tests against its actual rotated rectangular bounds, since a resizable
// zone can be much larger than a fixed hit radius — without this, tapping anywhere inside a
// large rectangle except near its center would fail to select it.
export function isPointInObjectHit(
  object: PlacedObject,
  eventX: number,
  eventY: number,
  canvasSize: CanvasSize
): boolean {
  'worklet'
  const cx = object.x * canvasSize.width
  const cy = object.y * canvasSize.height

  if (object.type === 'zone') {
    const footprint = getObjectFootprint(object, canvasSize)
    const halfW = (footprint.width * object.scale) / 2
    const halfH = (footprint.height * object.scale) / 2
    const dx = eventX - cx
    const dy = eventY - cy
    const cos = Math.cos(object.rotation)
    const sin = Math.sin(object.rotation)
    const localX = dx * cos + dy * sin
    const localY = -dx * sin + dy * cos
    return Math.abs(localX) <= halfW && Math.abs(localY) <= halfH
  }

  if (object.type === 'circle-zone') {
    const radius = object.radius * canvasSize.width * object.scale
    return Math.hypot(eventX - cx, eventY - cy) <= radius
  }

  // HIT_RADIUS alone comfortably covers small equipment (cone, ball) but goal/mini-goal render
  // well past it (see EQUIPMENT_ASSETS nativeWidth) — floor the hit radius at HIT_RADIUS so small
  // items keep their existing generous tap area, but grow it to match footprint for anything
  // whose visual size actually exceeds that, so a wide goal is tappable/selectable/rotatable
  // (rotation requires selecting it first) across its whole sprite, not just a small center dot.
  const footprint = getObjectFootprint(object, canvasSize)
  const radius = Math.max(HIT_RADIUS, footprint.width / 2, footprint.height / 2) * object.scale
  return Math.hypot(eventX - cx, eventY - cy) <= radius
}

export interface ScreenBox {
  left: number
  top: number
  right: number
  bottom: number
}

// Rotates a point given in object-local space (origin at the object's center) by `rotation`
// radians and places it at world position (cx, cy). Shared by the bounding-box corners below
// and by the gesture hook's rotate/scale handle positioning.
export function rotatePointAround(
  local: { x: number; y: number },
  rotation: number,
  cx: number,
  cy: number
): { x: number; y: number } {
  'worklet'
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return { x: cx + local.x * cos - local.y * sin, y: cy + local.x * sin + local.y * cos }
}

// Axis-aligned bounding box that circumscribes a rotated rect (object footprint + rotation),
// used to position the selection outline/toolbar without needing per-corner rotation in RN layout.
export function rotatedBoundingBox(cx: number, cy: number, width: number, height: number, rotation: number): ScreenBox {
  'worklet'
  const hw = width / 2
  const hh = height / 2
  const corners = [
    rotatePointAround({ x: -hw, y: -hh }, rotation, cx, cy),
    rotatePointAround({ x: hw, y: -hh }, rotation, cx, cy),
    rotatePointAround({ x: hw, y: hh }, rotation, cx, cy),
    rotatePointAround({ x: -hw, y: hh }, rotation, cx, cy),
  ]

  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

export function cubicBezierPointAt(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
): { x: number; y: number } {
  'worklet'
  const mt = 1 - t
  const a = mt * mt * mt
  const b = 3 * mt * mt * t
  const c = 3 * mt * t * t
  const d = t * t * t
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  }
}

const BEZIER_SAMPLES = 24

// Approximate (sampled, not analytic) distance from a point to a cubic bezier — exact enough
// for hit-testing at BEZIER_SAMPLES resolution given the short, mostly-straight arrows this
// canvas draws. Used for arrow selection, inflated by canvas.line.hitInflate by the caller.
export function distanceToCubicBezier(
  point: { x: number; y: number },
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  'worklet'
  let min = Infinity
  for (let i = 0; i <= BEZIER_SAMPLES; i += 1) {
    const sample = cubicBezierPointAt(p0, p1, p2, p3, i / BEZIER_SAMPLES)
    const distance = Math.hypot(point.x - sample.x, point.y - sample.y)
    if (distance < min) min = distance
  }
  return min
}

// Screen-space bounding box of an arrow's curve (sampled), for toolbar/selection positioning.
// `points` are normalized 0..1; canvasSize converts to on-screen pixels.
export function getArrowScreenBounds(points: { x: number; y: number }[], canvasSize: CanvasSize): ScreenBox {
  const [p0, p1, p2, p3] = points.map((point) => ({ x: point.x * canvasSize.width, y: point.y * canvasSize.height }))
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= BEZIER_SAMPLES; i += 1) {
    const sample = cubicBezierPointAt(p0, p1, p2, p3, i / BEZIER_SAMPLES)
    xs.push(sample.x)
    ys.push(sample.y)
  }
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

export function createDefaultObject(
  tool: PlaceableToolType,
  x: number,
  y: number,
  canvasSize: CanvasSize,
  zIndex: number
): PlacedObject {
  const base = { id: randomUUID(), x, y, rotation: 0, scale: 1, zIndex }

  switch (tool) {
    case 'player-blank':
      return { ...base, type: 'player', label: '', teamIndex: 0 }
    case 'player-gk':
      return { ...base, type: 'player', label: 'GK', teamIndex: 0 }
    case 'player-co':
      return { ...base, type: 'player', label: 'Co', teamIndex: 0 }
    case 'cone':
      return { ...base, type: 'cone', color: CONE_DEFAULT_COLOR }
    case 'goal':
      return { ...base, type: 'goal', width: EQUIPMENT_ASSETS.goal.nativeWidth / canvasSize.width }
    case 'mini-goal':
      return { ...base, type: 'mini-goal', width: EQUIPMENT_ASSETS['mini-goal'].nativeWidth / canvasSize.width }
    case 'ball-bw':
      return { ...base, type: 'ball', variant: 'bw' }
    case 'ball-color':
      return { ...base, type: 'ball', variant: 'color' }
    case 'shape-rect':
      return { ...base, type: 'zone', width: ZONE_DEFAULT_WIDTH, height: ZONE_DEFAULT_HEIGHT }
    case 'shape-circle':
      return { ...base, type: 'circle-zone', radius: CIRCLE_ZONE_DEFAULT_RADIUS }
  }
}
