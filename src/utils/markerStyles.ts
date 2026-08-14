import type { MarkerStyle } from '../types'

export const DEFAULT_MARKER_STYLE: MarkerStyle = 'circle'

export const MARKER_STYLE_OPTIONS: Array<{ value: MarkerStyle; label: string }> = [
  { value: 'circle', label: 'Circle' },
  { value: 'jersey', label: 'Jersey' },
]

export function isMarkerStyle(value: unknown): value is MarkerStyle {
  return value === 'circle' || value === 'jersey'
}
