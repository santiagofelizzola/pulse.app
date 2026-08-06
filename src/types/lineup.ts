import type { CanvasBackground } from './canvas'

export type SquadSize = 7 | 9 | 11

// Formation values are only meaningful together with squadSize —
// e.g. '3-2-3' at 9v9 is a different shape than any 11-a-side formation.
// Each squad size ships exactly 3 named formations + 'custom'.
export type Formation7 = '2-3-1' | '3-2-1' | '3-1-2' | 'custom'
export type Formation9 = '3-3-2' | '3-2-3' | '3-1-3-1' | 'custom'
export type Formation11 = '4-4-2' | '4-3-3' | '4-2-3-1' | 'custom'
export type Formation = Formation7 | Formation9 | Formation11

export interface LineupPosition {
  id: string
  label: string              // player name or 1–2 char initials
  role?: string              // optional slot label (GK, CB, ST, …)
  x: number                  // normalized 0..1 across the pitch
  y: number                  // normalized 0..1 down the pitch
}

export interface Lineup {
  id: string                 // device-generated uuid
  name: string
  matchDate?: string         // ISO date of the fixture
  squadSize: SquadSize
  formation?: Formation      // must be valid for squadSize; 'custom' always allowed
  background: CanvasBackground   // typically 'full-pitch'
  positions: LineupPosition[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateLineupInput {
  name: string
  matchDate?: string
  squadSize: SquadSize
  formation?: Formation
  positions: LineupPosition[]
  notes?: string
}
