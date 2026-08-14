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

function makePosition(x: number, y: number, role?: string, isKeeper?: boolean): LineupPosition {
  return { id: randomUUID(), label: '', role, x, y, isKeeper }
}

// isKeeper is only present on positions generated after this field was added — any lineup
// created (or already saved) before then has it undefined on every position, including its
// actual goalkeeper, which would otherwise silently make keeperColor never apply to anything.
// role still reads 'GK' for those older/loaded positions (that part of the data has always been
// saved), so fall back to it. isKeeper stays authoritative when set, since a coach can freely
// rename `role` in PositionEditSheet without that meaning they moved who's in goal.
export function isKeeperPosition(position: Pick<LineupPosition, 'isKeeper' | 'role'>): boolean {
  return position.isKeeper === true || position.role === 'GK'
}

// Roles are coach-editable free text, so every comparison against them goes through here rather
// than matching the raw string.
export function normalizeRole(role: string | undefined): string {
  return (role ?? '').trim().toUpperCase()
}

// Right to left across the pitch.
function byXDescending(a: LineupPosition, b: LineupPosition): number {
  return b.x - a.x
}

/**
 * Moves the players from an existing lineup onto a new formation's slots, so changing formation
 * rearranges the team instead of wiping it — a coach who has named eleven players and tweaks the
 * shape keeps every name and shirt number.
 *
 * Only `label` and `shirtNumber` travel: `role`, `x` and `y` belong to the new formation, which is
 * the whole point of picking one. Matching runs keeper first, then same-role pairs sorted right to
 * left on both sides (so two centre backs keep their sides instead of swapping), then a positional
 * sweep for anything left over. At equal squad size the pools drain evenly, so nobody is dropped.
 */
export function carryOverPlayers(previous: LineupPosition[], slots: LineupPosition[]): LineupPosition[] {
  if (previous.length === 0) return slots

  const carried = new Map<string, LineupPosition>()
  const claimed = new Set<string>()

  const pair = (players: LineupPosition[], targets: LineupPosition[]) => {
    const count = Math.min(players.length, targets.length)
    for (let index = 0; index < count; index += 1) {
      carried.set(targets[index].id, players[index])
      claimed.add(players[index].id)
    }
  }

  const availablePlayers = () => previous.filter((player) => !claimed.has(player.id))
  const openSlots = () => slots.filter((slot) => !carried.has(slot.id))

  // The keeper is matched on isKeeperPosition rather than the role string, so the name still
  // follows the gloves across a switch to 'custom', which strips every role but keeps isKeeper.
  pair(availablePlayers().filter(isKeeperPosition), openSlots().filter(isKeeperPosition))

  // Same role, both sides sorted right to left: the right-sided player of a duplicated role lands
  // on the right-sided slot of that role, so a back four doesn't invert itself.
  const rolesInNewShape = new Set(openSlots().map((slot) => normalizeRole(slot.role)).filter(Boolean))
  rolesInNewShape.forEach((role) => {
    pair(
      availablePlayers().filter((player) => normalizeRole(player.role) === role).sort(byXDescending),
      openSlots().filter((slot) => normalizeRole(slot.role) === role).sort(byXDescending)
    )
  })

  // Everyone the role passes couldn't place: a winger moving into a shape with no wingers, a
  // hand-renamed role that matches nothing, and — the whole squad at once — a 'custom' formation,
  // whose slots carry no roles at all. Both pools are still in array order (keeper first, then back
  // to front), so this pairs them positionally rather than arbitrarily.
  pair(availablePlayers(), openSlots())

  return slots.map((slot) => {
    const player = carried.get(slot.id)
    return player ? { ...slot, label: player.label, shirtNumber: player.shirtNumber } : slot
  })
}

// No formation semantics — reuses the squad size's first named formation's positions (a
// sensible non-overlapping starting layout) but strips every role, so markers start blank and
// fully free-drag/relabel rather than implying an unpicked formation's shape. isKeeper is kept
// (not stripped) so the goalkeeper slot still gets keeperColor even under 'custom'.
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
  const positions: LineupPosition[] = [makePosition(0.5, GK_Y, 'GK', true)]

  lines.forEach((count, lineIndex) => {
    const kind = lineKind(lineIndex, lines.length)
    const y = lineDepth(lineIndex, lines.length)
    lineXs(count).forEach((x, indexInLine) => {
      positions.push(makePosition(x, y, roleAbbreviation(kind, indexInLine, count)))
    })
  })

  return positions
}
