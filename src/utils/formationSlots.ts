import { randomUUID } from 'expo-crypto'

import type { Formation, Formation7, Formation9, Formation11, LineupPosition, SquadSize } from '../types'

export const SQUAD_SIZE_OPTIONS: { value: SquadSize; label: string }[] = [
  { value: 7, label: '7v7' },
  { value: 9, label: '9v9' },
  { value: 11, label: '11v11' },
]

// Every named formation's outfield numbers sum to squadSize - 1 (the GK is placed separately,
// not counted in the string). See architecture.md's Lineup formations decision.
const FORMATION_OPTIONS: {
  7: { value: Formation7; label: string }[]
  9: { value: Formation9; label: string }[]
  11: { value: Formation11; label: string }[]
} = {
  7: [
    { value: '2-3-1', label: '2-3-1' },
    { value: '3-2-1', label: '3-2-1' },
    { value: '3-1-2', label: '3-1-2' },
    { value: 'custom', label: 'Custom' },
  ],
  9: [
    { value: '3-4-1', label: '3-4-1' },
    { value: '2-5-1', label: '2-5-1' },
    { value: '3-2-3', label: '3-2-3' },
    { value: 'custom', label: 'Custom' },
  ],
  11: [
    { value: '4-3-3', label: '4-3-3' },
    { value: '4-4-2', label: '4-4-2' },
    { value: '3-5-2', label: '3-5-2' },
    { value: 'custom', label: 'Custom' },
  ],
}

export function getFormationOptions(squadSize: SquadSize) {
  return FORMATION_OPTIONS[squadSize]
}

// Depth (y) of the goalkeeper and the defense-to-attack line spread, normalized 0..1 down the
// full-pitch background (y=0 is the far/attacking goal, y=1 is the near/own goal — see
// PitchBackground). Outfield lines interpolate evenly between DEF_Y and ATT_Y.
const GK_Y = 0.93
const DEF_Y = 0.78
const ATT_Y = 0.1
const X_MARGIN = 0.12

function lineDepth(lineIndex: number, lineCount: number): number {
  if (lineCount === 1) return (DEF_Y + ATT_Y) / 2
  const t = lineIndex / (lineCount - 1)
  return DEF_Y + t * (ATT_Y - DEF_Y)
}

// Evenly spaced x-centers for `count` players within [X_MARGIN, 1 - X_MARGIN].
function lineXs(count: number): number[] {
  const span = 1 - X_MARGIN * 2
  return Array.from({ length: count }, (_, i) => X_MARGIN + (i + 0.5) * (span / count))
}

type LineKind = 'DEF' | 'MID' | 'FWD'

function lineKind(lineIndex: number, lineCount: number): LineKind {
  if (lineCount === 1) return 'MID'
  if (lineCount === 2) return lineIndex === 0 ? 'DEF' : 'FWD'
  const t = lineIndex / (lineCount - 1)
  if (t < 0.5) return 'DEF'
  if (t > 0.5) return 'FWD'
  return 'MID'
}

// Center slots in a line get the line's "core" role; the two edge slots (when a line has 3+
// players) get the wide variant — FB for defense, W for attack. Midfield needs one more player
// before it earns wide markers: a line of 4+ (e.g. 4-4-2's flat four, 9v9's 2-5-1) gets W at the
// edges, but a 3-player midfield (e.g. 4-3-3) stays uniform CM — applies at every squad size.
function roleAbbreviation(kind: LineKind, indexInLine: number, lineSize: number): string {
  const isEdge = lineSize >= 3 && (indexInLine === 0 || indexInLine === lineSize - 1)
  if (kind === 'DEF') return isEdge ? 'FB' : 'CB'
  if (kind === 'MID') return lineSize >= 4 && isEdge ? 'W' : 'CM'
  return isEdge ? 'W' : 'ST'
}

function makePosition(x: number, y: number, role?: string): LineupPosition {
  return { id: randomUUID(), label: '', role, x, y }
}

// No formation semantics — reuses the squad size's first named formation's positions (a
// sensible non-overlapping starting layout) but strips every role, so markers start blank and
// fully free-drag/relabel rather than implying an unpicked formation's shape.
function getCustomSlots(squadSize: SquadSize): LineupPosition[] {
  const firstFormation = getFormationOptions(squadSize)[0].value
  return getFormationSlots(squadSize, firstFormation).map((slot) => ({
    ...slot,
    id: randomUUID(),
    role: undefined,
  }))
}

export function getFormationSlots(squadSize: SquadSize, formation: Formation): LineupPosition[] {
  if (formation === 'custom') return getCustomSlots(squadSize)

  const lines = formation.split('-').map(Number)
  const positions: LineupPosition[] = [makePosition(0.5, GK_Y, 'GK')]

  lines.forEach((count, lineIndex) => {
    const kind = lineKind(lineIndex, lines.length)
    const y = lineDepth(lineIndex, lines.length)
    lineXs(count).forEach((x, indexInLine) => {
      positions.push(makePosition(x, y, roleAbbreviation(kind, indexInLine, count)))
    })
  })

  return positions
}
