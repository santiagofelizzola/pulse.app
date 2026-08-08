import { useEffect, useState } from 'react'
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

// Equipment SVG assets — recolored (ladder/goal/mini-goal) or stroke-thickened (balls) on load.
// agilityRing.svg is intentionally unused: the disc is drawn as concentric Skia circles per design.md §7.

// Tunable: the ball SVGs' native stroke-width (~0.1 in an ~9-unit viewBox) renders far thinner than
// the 2px marker-border weight at 26px. This value is a starting point, not a final answer —
// soccerBall.svg (many small colored patches) goes muddy well before BWsoccerBall.svg does,
// since every patch's stroke is a dark color that competes with the fill. Adjust to taste.
const BALL_STROKE_MULTIPLIER = 3

export const EQUIPMENT_ASSETS = {
  // Ladder's whole silhouette comes from one filled compound path (the rung cutouts
  // only exist because of the fill), so it keeps its fill recolored to canvasInk.
  ladder: {
    module: require('../../assets/icons/ladder.svg') as number,
    mode: 'recolor' as const,
    aspectRatio: 92.6 / 14.6,
    nativeWidth: 44,
  },
  // Goal/mini-goal's fills are Illustrator's fake-3D frame-extrusion quads (meant for a
  // photoreal green-pitch look) — recoloring them solid turns the frame into a black
  // blob. Stripping fill (each shape still has its own stroke) renders a clean wireframe.
  goal: {
    module: require('../../assets/icons/soccerGoal.svg') as number,
    mode: 'recolor-outline' as const,
    aspectRatio: 131.2 / 68,
    nativeWidth: 36,
  },
  'mini-goal': {
    module: require('../../assets/icons/miniSoccerGoal.svg') as number,
    mode: 'recolor-outline' as const,
    aspectRatio: 49.5 / 32.5,
    nativeWidth: 32,
  },
  'ball-bw': {
    module: require('../../assets/icons/BWsoccerBall.svg') as number,
    mode: 'thicken' as const,
    aspectRatio: 8.9 / 9,
    nativeWidth: canvas.equipment.size,
  },
  'ball-color': {
    module: require('../../assets/icons/soccerBall.svg') as number,
    mode: 'thicken' as const,
    aspectRatio: 8.9 / 9,
    nativeWidth: canvas.equipment.size,
  },
} as const

export type EquipmentAssetKey = keyof typeof EQUIPMENT_ASSETS

// The source SVGs are Adobe Illustrator exports with a DOCTYPE/internal-entity header
// (custom ENTITY declarations referenced via xmlns:x="&ns_extend;" etc). Skia's SVG parser
// doesn't resolve custom entities and silently fails to parse the whole document, so strip
// that boilerplate first — it carries no rendered content.
function stripAdobeCruft(svgText: string): string {
  return svgText.replace(/<!DOCTYPE[^[]*\[[^\]]*\]>/, '').replace(/\s+xmlns:(x|i|graph|a)="[^"]*"/g, '')
}

// These source SVGs put all styling in a <style> CSS block with class="stN" per element —
// Skia's SVG parser doesn't resolve that (fill silently defaults to black regardless of what
// the CSS says), so inline each class's declarations onto its elements as plain XML
// presentation attributes (fill="...", stroke="...", ...), which every SVG parser supports.
function inlineSvgClasses(svgText: string): string {
  const styleMatch = svgText.match(/<style[^]*?<\/style>/)
  if (!styleMatch) return svgText

  const classAttrs = new Map<string, string>()
  const ruleRegex = /\.(\w+)\s*\{([^}]*)\}/g
  let rule: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((rule = ruleRegex.exec(styleMatch[0]))) {
    const attrs = rule[2]
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const [prop, value] = declaration.split(':').map((part) => part.trim())
        return `${prop}="${value}"`
      })
      .join(' ')
    classAttrs.set(rule[1], attrs)
  }

  return svgText.replace(styleMatch[0], '').replace(/class="(\w+)"/g, (full, className: string) => classAttrs.get(className) ?? full)
}

function recolorSvgText(svgText: string, hexColor: string): string {
  return svgText
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, `fill="${hexColor}"`)
    .replace(/stroke="#[0-9A-Fa-f]{3,8}"/g, `stroke="${hexColor}"`)
}

// Like recolorSvgText, but drops fills to `none` instead of recoloring them — renders as a
// wireframe of just the strokes. Used for assets whose fills are 3D-extrusion shading rather
// than the actual silhouette (see EQUIPMENT_ASSETS comments).
function recolorSvgOutline(svgText: string, hexColor: string): string {
  return svgText.replace(/fill="#[0-9A-Fa-f]{3,8}"/g, 'fill="none"').replace(/stroke="#[0-9A-Fa-f]{3,8}"/g, `stroke="${hexColor}"`)
}

function thickenStrokeWidths(svgText: string, multiplier: number): string {
  return svgText.replace(
    /stroke-width="([0-9.]+)"/g,
    (_match, value: string) => `stroke-width="${(parseFloat(value) * multiplier).toFixed(3)}"`
  )
}

const svgCache = new Map<string, SkSVG | null>()
const svgLoads = new Map<string, Promise<SkSVG | null>>()

async function loadEquipmentSvg(key: EquipmentAssetKey): Promise<SkSVG | null> {
  if (svgCache.has(key)) return svgCache.get(key) ?? null

  const existing = svgLoads.get(key)
  if (existing) return existing

  const promise = (async () => {
    const config = EQUIPMENT_ASSETS[key]
    const asset = Asset.fromModule(config.module)
    await asset.downloadAsync()
    if (!asset.localUri) return null

    const raw = inlineSvgClasses(stripAdobeCruft(await FileSystem.readAsStringAsync(asset.localUri)))
    let processed: string
    if (config.mode === 'recolor') {
      processed = recolorSvgText(raw, colors.canvasInk)
    } else if (config.mode === 'recolor-outline') {
      processed = recolorSvgOutline(raw, colors.canvasInk)
    } else {
      processed = thickenStrokeWidths(raw, BALL_STROKE_MULTIPLIER)
    }
    const svg = Skia.SVG.MakeFromString(processed)
    svgCache.set(key, svg)
    return svg
  })()

  svgLoads.set(key, promise)
  return promise
}

export function useEquipmentSvg(key: EquipmentAssetKey): SkSVG | null {
  const [svg, setSvg] = useState<SkSVG | null>(svgCache.get(key) ?? null)

  useEffect(() => {
    let cancelled = false
    loadEquipmentSvg(key).then((result) => {
      if (!cancelled) setSvg(result)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return svg
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
      return { ...base, type: 'cone', color: colors.canvasInk }
    case 'disc':
      return { ...base, type: 'disc', color: colors.canvasInk }
    case 'pole':
      return { ...base, type: 'pole' }
    case 'ladder':
      return { ...base, type: 'ladder' }
    case 'flag':
      return { ...base, type: 'flag' }
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
