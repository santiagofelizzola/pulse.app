import type { LabelDisplay, LineupPosition } from '../types'

// 'blank' rather than 'position': a coach placing players starts from clean markers and opts in
// to the diagram annotation, instead of having to clear a default. Only applies to newly created
// lineups — every lineup that predates this field is migrated to the mode it already displayed.
export const DEFAULT_LABEL_DISPLAY: LabelDisplay = 'blank'

export const LABEL_DISPLAY_OPTIONS: Array<{ value: LabelDisplay; label: string }> = [
  { value: 'blank', label: 'Blank' },
  { value: 'number', label: 'Number' },
  { value: 'position', label: 'Position' },
]

export function isLabelDisplay(value: unknown): value is LabelDisplay {
  return value === 'blank' || value === 'number' || value === 'position'
}

// The single place the three modes turn into pixels. MarkerVisual takes the resulting string and
// never learns the mode existed — same value-driven split as PitchBackground and PITCH_STYLES,
// so a future mode (initials, minutes, ...) is a new case here plus a new union member.
export function getMarkerText(
  position: Pick<LineupPosition, 'role' | 'shirtNumber'>,
  labelDisplay: LabelDisplay
): string {
  if (labelDisplay === 'position') return position.role ?? ''
  // A position with no number yet renders blank rather than falling back to its role — the mode
  // is a promise about WHAT the text means, and a role sitting where a number should be misreads.
  if (labelDisplay === 'number') return position.shirtNumber != null ? String(position.shirtNumber) : ''
  return ''
}
