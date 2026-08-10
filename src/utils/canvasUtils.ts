import { useEffect, useMemo, useState } from 'react'
import { Asset } from 'expo-asset'
import { randomUUID } from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import { Skia, type SkSVG } from '@shopify/react-native-skia'

import { canvas } from '../theme/theme'
import type { PlaceableToolType } from '../store/canvasStore'
import type { PlacedObject } from '../types'

// Hit-testing / placement

export const HIT_RADIUS = 24
export const TAP_SLOP = 8

// Default cone body color — traffic-cone orange, distinct from the fixed dark base stripe
// baked into cone.svg. (Other equipment still defaults to colors.canvasInk; the cone is the
// one currently-colorable item, so it gets a color worth seeing by default.)
export const CONE_DEFAULT_COLOR = '#EE7110'

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
    nativeWidth: 23,
  },
  ladder: {
    module: require('../../assets/icons/ladder.svg') as number,
    thicken: false,
    nativeWidth: canvas.equipment.size,
  },
  goal: {
    module: require('../../assets/icons/soccerGoal.svg') as number,
    thicken: false,
    nativeWidth: 50,
  },
  'mini-goal': {
    module: require('../../assets/icons/miniSoccerGoal.svg') as number,
    thicken: false,
    nativeWidth: 31,
  },
  'ball-bw': {
    module: require('../../assets/icons/BWsoccerBall.svg') as number,
    thicken: true,
    nativeWidth: 23,
  },
  'ball-color': {
    module: require('../../assets/icons/soccerBall.svg') as number,
    thicken: true,
    nativeWidth: 23,
  },
} as const

export type EquipmentAssetKey = keyof typeof EQUIPMENT_ASSETS

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

export function createDefaultObject(tool: PlaceableToolType, x: number, y: number, canvasSize: CanvasSize): PlacedObject {
  const base = { id: randomUUID(), x, y, rotation: 0, scale: 1 }

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
  }
}
