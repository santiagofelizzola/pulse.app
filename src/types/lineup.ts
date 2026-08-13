import type { CanvasBackground } from './canvas'

export type SquadSize = 7 | 9 | 11

// Formation values are only meaningful together with squadSize —
// e.g. '3-2-3' at 9v9 is a different shape than any 11-a-side formation.
// Each squad size ships exactly 3 named formations + 'custom'. Every named formation's numbers
// sum to squadSize - 1 (the remaining player is the goalkeeper, not counted in the string).
export type Formation7 = '2-3-1' | '3-2-1' | '3-1-2' | 'custom'
export type Formation9 = '3-4-1' | '2-5-1' | '3-2-3' | 'custom'
export type Formation11 = '4-3-3' | '4-4-2' | '3-5-2' | 'custom'
export type Formation = Formation7 | Formation9 | Formation11

export interface LineupPosition {
  id: string
  label: string              // player name or 1–2 char initials, shown BELOW the marker
  role?: string              // positional slot abbreviation (GK, CB, ST, …), shown INSIDE the marker
  x: number                  // normalized 0..1 across the pitch
  y: number                  // normalized 0..1 down the pitch
  // Set on the goalkeeper slot by getFormationSlots (and preserved through the 'custom' formation's
  // role-stripping) — an explicit flag rather than inferring from role, since a coach can freely
  // rename `role` in PositionEditSheet. Drives which of teamColor/keeperColor a marker renders in.
  isKeeper?: boolean
}

// A structured substitute entry — starters remain the on-pitch LineupPositions above.
export interface SubEntry {
  id: string
  name: string
  position?: string
}

export interface Lineup {
  id: string                 // device-generated uuid
  name: string
  matchDate?: string         // ISO date of the fixture (optional, not surfaced in the editor UI)
  squadSize: SquadSize
  formation?: Formation      // must be valid for squadSize; 'custom' always allowed
  background: CanvasBackground   // typically 'full-pitch'
  positions: LineupPosition[]
  showRoleLabels?: boolean   // whether markers render their `role` text or appear blank; defaults true
  subs?: SubEntry[]
  notes?: string
  // Marker fill colors — teamColor applies to every outfield position, keeperColor to the one
  // flagged isKeeper. Both optional; unset renders the original default white marker.
  teamColor?: string
  keeperColor?: string
  createdAt: string
  updatedAt: string
}

export interface CreateLineupInput {
  name: string
  matchDate?: string
  squadSize: SquadSize
  formation?: Formation
  positions: LineupPosition[]
  showRoleLabels?: boolean
  subs?: SubEntry[]
  notes?: string
  teamColor?: string
  keeperColor?: string
}
