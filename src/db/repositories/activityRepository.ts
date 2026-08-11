import { randomUUID } from 'expo-crypto'

import { getDatabase } from '../database'
import type { Activity, CreateActivityInput, ActivityTag, CanvasData } from '../../types'

interface ActivityRow {
  id: string
  name: string
  tag: ActivityTag | null
  duration_minutes: number | null
  notes: string | null
  canvas_data: string
  thumbnail_uri: string | null
  created_at: string
  updated_at: string
}

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    notes: row.notes ?? undefined,
    canvasData: JSON.parse(row.canvas_data) as CanvasData,
    thumbnailUri: row.thumbnail_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function list(): Promise<Activity[]> {
  const db = getDatabase()
  const rows = db.getAllSync<ActivityRow>('SELECT * FROM activities ORDER BY updated_at DESC')
  return rows.map(toActivity)
}

async function getById(id: string): Promise<Activity | null> {
  const db = getDatabase()
  const row = db.getFirstSync<ActivityRow>('SELECT * FROM activities WHERE id = ?', id)
  return row ? toActivity(row) : null
}

async function create(input: CreateActivityInput): Promise<Activity> {
  const db = getDatabase()
  const now = new Date().toISOString()
  const activity: Activity = {
    id: randomUUID(),
    name: input.name,
    tag: input.tag,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    canvasData: input.canvasData,
    thumbnailUri: input.thumbnailUri,
    createdAt: now,
    updatedAt: now,
  }

  db.runSync(
    `INSERT INTO activities (id, name, tag, duration_minutes, notes, canvas_data, thumbnail_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    activity.id,
    activity.name,
    activity.tag ?? null,
    activity.durationMinutes ?? null,
    activity.notes ?? null,
    JSON.stringify(activity.canvasData),
    activity.thumbnailUri ?? null,
    activity.createdAt,
    activity.updatedAt
  )

  return activity
}

async function update(id: string, patch: Partial<CreateActivityInput>): Promise<Activity | null> {
  const db = getDatabase()
  const existing = await getById(id)
  if (!existing) return null

  const updated: Activity = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  db.runSync(
    `UPDATE activities
     SET name = ?, tag = ?, duration_minutes = ?, notes = ?, canvas_data = ?, updated_at = ?
     WHERE id = ?`,
    updated.name,
    updated.tag ?? null,
    updated.durationMinutes ?? null,
    updated.notes ?? null,
    JSON.stringify(updated.canvasData),
    updated.updatedAt,
    id
  )

  return updated
}

async function deleteActivity(id: string): Promise<void> {
  const db = getDatabase()
  db.runSync('DELETE FROM activities WHERE id = ?', id)
}

export const activityRepository = {
  list,
  getById,
  create,
  update,
  delete: deleteActivity,
}
