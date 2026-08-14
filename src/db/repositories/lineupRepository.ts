import { randomUUID } from 'expo-crypto'

import { getDatabase } from '../database'
import { DEFAULT_LABEL_DISPLAY, isLabelDisplay } from '../../utils/labelDisplay'
import { DEFAULT_MARKER_STYLE, isMarkerStyle } from '../../utils/markerStyles'
import { DEFAULT_PITCH_STYLE, isPitchStyle } from '../../utils/pitchStyles'
import type {
  Lineup,
  CreateLineupInput,
  Formation,
  CanvasBackground,
  LineupPosition,
  SubEntry,
} from '../../types'

interface LineupRow {
  id: string
  name: string
  match_date: string | null
  squad_size: number
  formation: Formation | null
  background: CanvasBackground
  positions: string
  label_display: string | null
  subs: string
  notes: string | null
  team_color: string | null
  keeper_color: string | null
  pitch_style: string | null
  marker_style: string | null
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
    labelDisplay: isLabelDisplay(row.label_display) ? row.label_display : DEFAULT_LABEL_DISPLAY,
    subs: JSON.parse(row.subs) as SubEntry[],
    notes: row.notes ?? undefined,
    teamColor: row.team_color ?? undefined,
    keeperColor: row.keeper_color ?? undefined,
    // Guarded rather than cast: an unrecognized stored value falls back to the default preset
    // instead of handing the renderer a style it can't resolve.
    pitchStyle: isPitchStyle(row.pitch_style) ? row.pitch_style : DEFAULT_PITCH_STYLE,
    markerStyle: isMarkerStyle(row.marker_style) ? row.marker_style : DEFAULT_MARKER_STYLE,
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
    labelDisplay: input.labelDisplay ?? DEFAULT_LABEL_DISPLAY,
    subs: input.subs ?? [],
    notes: input.notes,
    teamColor: input.teamColor,
    keeperColor: input.keeperColor,
    pitchStyle: input.pitchStyle ?? DEFAULT_PITCH_STYLE,
    markerStyle: input.markerStyle ?? DEFAULT_MARKER_STYLE,
    createdAt: now,
    updatedAt: now,
  }

  db.runSync(
    // show_role_labels is deliberately absent: migration 008 replaced it with label_display and
    // left the column behind with its DEFAULT 1, which is what fills it here.
    `INSERT INTO lineups (id, name, match_date, squad_size, formation, background, positions, label_display, subs, notes, team_color, keeper_color, pitch_style, marker_style, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    lineup.id,
    lineup.name,
    lineup.matchDate ?? null,
    lineup.squadSize,
    lineup.formation ?? null,
    lineup.background,
    JSON.stringify(lineup.positions),
    lineup.labelDisplay ?? DEFAULT_LABEL_DISPLAY,
    JSON.stringify(lineup.subs),
    lineup.notes ?? null,
    lineup.teamColor ?? null,
    lineup.keeperColor ?? null,
    lineup.pitchStyle ?? DEFAULT_PITCH_STYLE,
    lineup.markerStyle ?? DEFAULT_MARKER_STYLE,
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
     SET name = ?, match_date = ?, squad_size = ?, formation = ?, positions = ?, label_display = ?, subs = ?, notes = ?, team_color = ?, keeper_color = ?, pitch_style = ?, marker_style = ?, updated_at = ?
     WHERE id = ?`,
    updated.name,
    updated.matchDate ?? null,
    updated.squadSize,
    updated.formation ?? null,
    JSON.stringify(updated.positions),
    updated.labelDisplay ?? DEFAULT_LABEL_DISPLAY,
    JSON.stringify(updated.subs ?? []),
    updated.notes ?? null,
    updated.teamColor ?? null,
    updated.keeperColor ?? null,
    updated.pitchStyle ?? DEFAULT_PITCH_STYLE,
    updated.markerStyle ?? DEFAULT_MARKER_STYLE,
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
