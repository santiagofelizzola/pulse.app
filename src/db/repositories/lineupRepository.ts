import { randomUUID } from 'expo-crypto'

import { getDatabase } from '../database'
import type {
  Lineup,
  CreateLineupInput,
  Formation,
  CanvasBackground,
  LineupPosition,
} from '../../types'

interface LineupRow {
  id: string
  name: string
  match_date: string | null
  squad_size: number
  formation: Formation | null
  background: CanvasBackground
  positions: string
  notes: string | null
  created_at: string
  updated_at: string
}

function toLineup(row: LineupRow): Lineup {
  return {
    id: row.id,
    name: row.name,
    matchDate: row.match_date ?? undefined,
    squadSize: row.squad_size as Lineup['squadSize'],
    formation: row.formation ?? undefined,
    background: row.background,
    positions: JSON.parse(row.positions) as LineupPosition[],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function list(): Promise<Lineup[]> {
  const db = getDatabase()
  const rows = db.getAllSync<LineupRow>('SELECT * FROM lineups ORDER BY updated_at DESC')
  return rows.map(toLineup)
}

async function getById(id: string): Promise<Lineup | null> {
  const db = getDatabase()
  const row = db.getFirstSync<LineupRow>('SELECT * FROM lineups WHERE id = ?', id)
  return row ? toLineup(row) : null
}

async function create(input: CreateLineupInput): Promise<Lineup> {
  const db = getDatabase()
  const now = new Date().toISOString()
  const lineup: Lineup = {
    id: randomUUID(),
    name: input.name,
    matchDate: input.matchDate,
    squadSize: input.squadSize,
    formation: input.formation,
    background: 'full-pitch',
    positions: input.positions,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }

  db.runSync(
    `INSERT INTO lineups (id, name, match_date, squad_size, formation, background, positions, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    lineup.id,
    lineup.name,
    lineup.matchDate ?? null,
    lineup.squadSize,
    lineup.formation ?? null,
    lineup.background,
    JSON.stringify(lineup.positions),
    lineup.notes ?? null,
    lineup.createdAt,
    lineup.updatedAt
  )

  return lineup
}

async function update(id: string, patch: Partial<CreateLineupInput>): Promise<Lineup | null> {
  const db = getDatabase()
  const existing = await getById(id)
  if (!existing) return null

  const updated: Lineup = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  db.runSync(
    `UPDATE lineups
     SET name = ?, match_date = ?, squad_size = ?, formation = ?, positions = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    updated.name,
    updated.matchDate ?? null,
    updated.squadSize,
    updated.formation ?? null,
    JSON.stringify(updated.positions),
    updated.notes ?? null,
    updated.updatedAt,
    id
  )

  return updated
}

async function deleteLineup(id: string): Promise<void> {
  const db = getDatabase()
  db.runSync('DELETE FROM lineups WHERE id = ?', id)
}

export const lineupRepository = {
  list,
  getById,
  create,
  update,
  delete: deleteLineup,
}
