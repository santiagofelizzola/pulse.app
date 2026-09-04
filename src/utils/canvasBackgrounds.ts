import type { CanvasBackground } from '../types'

// The pitch crops, in the order the background picker shows them. Single source of truth for
// "which backgrounds exist" — the picker maps over this, and isCanvasBackground guards stored
// values against it, so a new preset is one entry here plus a branch in PitchBackground.
export const CANVAS_BACKGROUND_OPTIONS: Array<{ value: CanvasBackground; label: string }> = [
  { value: 'full-pitch', label: 'Full pitch' },
  { value: 'half-pitch', label: 'Half pitch' },
  { value: 'final-third', label: 'Final third' },
  { value: 'penalty-box', label: 'Penalty box' },
  { value: 'blank', label: 'Blank' },
  { value: 'blank-halves', label: 'Halves' },
  { value: 'blank-thirds', label: 'Thirds' },
]

// What an unrecognizable stored value resolves to. Matches canvasStore's initial snapshot, so a
// drill that can't say what it wants gets the same surface a new one starts on.
export const DEFAULT_CANVAS_BACKGROUND: CanvasBackground = 'blank'

// Backgrounds that were once selectable and can still appear in stored JSON. Mapped to the
// closest surviving crop rather than dropped to the default, so an old drill keeps a frame its
// objects were positioned in.
//
// 'middle-third' -> 'final-third' is chosen for GEOMETRY, not for markings. The two share an
// aspect ratio exactly (both are PITCH_WIDTH_YD / (PITCH_LENGTH_YD / 3 / THIRD_FILL_FRAC) — see
// getPitchAspectRatio), so every stored normalized x/y lands on the pixel it always did and
// nothing in the drill shifts. What changes is the markings drawn under it: a goal box instead
// of a halfway line and centre circle. 'blank-halves' is closer by markings but would reflow the
// whole drill into a frame nearly twice as tall.
const RETIRED_BACKGROUNDS: Record<string, CanvasBackground> = {
  'middle-third': 'final-third',
}

const VALID_BACKGROUNDS = new Set<string>(CANVAS_BACKGROUND_OPTIONS.map((option) => option.value))

export function isCanvasBackground(value: unknown): value is CanvasBackground {
  return typeof value === 'string' && VALID_BACKGROUNDS.has(value)
}

/**
 * Resolves a persisted (possibly missing, retired or unrecognized) value to a renderable
 * background. Guarded, not cast — the same rule pitch_style/marker_style/label_display already
 * follow in the repositories: a stored value the renderer can't resolve falls back rather than
 * failing to render.
 */
export function resolveCanvasBackground(value: unknown): CanvasBackground {
  if (isCanvasBackground(value)) return value
  if (typeof value === 'string' && value in RETIRED_BACKGROUNDS) return RETIRED_BACKGROUNDS[value]
  return DEFAULT_CANVAS_BACKGROUND
}
