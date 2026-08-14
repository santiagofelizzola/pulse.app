import { canvas } from '../theme/theme'
import type { PitchStyle } from '../types'

// A pitch style is DATA, not code. PitchBackground renders whatever this object describes, so a
// future preset (red, blue, flat green, ...) is a new entry in PITCH_STYLES plus a new member of
// the PitchStyle union — the renderer never learns about it.
export interface PitchStyleValue {
  // Band colors, applied top to bottom and cycled. A single entry is a flat surface.
  bands: string[]
  // Whether `bands` repeats down the pitch as mowing stripes, or fills it flat with bands[0].
  striped: boolean
  // Color of the pitch markings drawn on top of the bands.
  lineColor: string
  // Color for text sitting directly on the surface rather than inside a marker — the player-name
  // captions. Part of the style because a dark caption vanishes on a dark surface.
  captionColor: string
  // Stripe count override; falls back to the shared canvas.pitch.bandCount.
  bandCount?: number
}

export const PITCH_STYLES: Record<PitchStyle, PitchStyleValue> = {
  white: {
    bands: [canvas.pitch.white],
    striped: false,
    lineColor: canvas.pitch.ink,
    captionColor: canvas.pitch.ink,
  },
  'green-striped': {
    bands: [canvas.pitch.turfDark, canvas.pitch.turfLight],
    striped: true,
    lineColor: canvas.pitch.white,
    captionColor: canvas.pitch.white,
  },
}

export const DEFAULT_PITCH_STYLE: PitchStyle = 'white'

export const PITCH_STYLE_OPTIONS: Array<{ value: PitchStyle; label: string }> = [
  { value: 'white', label: 'White' },
  { value: 'green-striped', label: 'Green stripes' },
]

export function isPitchStyle(value: unknown): value is PitchStyle {
  return typeof value === 'string' && value in PITCH_STYLES
}

/** Resolves a persisted (possibly null or unrecognized) value to a renderable style. */
export function getPitchStyleValue(style: PitchStyle | undefined | null): PitchStyleValue {
  return PITCH_STYLES[isPitchStyle(style) ? style : DEFAULT_PITCH_STYLE]
}
