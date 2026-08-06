import { randomUUID } from 'expo-crypto'
import type { SQLiteDatabase } from 'expo-sqlite'

import { getDatabase } from '../database'
import type {
  Session,
  SessionActivity,
  CreateSessionInput,
  AddSessionActivityInput,
  Activity,
  ActivityTag,
  BlockType,
  CanvasData,
} from '../../types'

interface SessionRow {
  id: string
  name: string
  total_duration_minutes: number
  created_at: string
  updated_at: string
}

interface SessionActivityRow {
  id: string
  session_id: string
  activity_id: string
  position: number
  block_type: BlockType
  coaching_points: string | null
  duration_override: number | null
  // joined from activities
  a_name: string
  a_tag: ActivityTag | null
  a_duration_minutes: number | null
  a_notes: string | null
  a_canvas_data: string
  a_thumbnail_uri: string | null
  a_created_at: string
  a_updated_at: string
}

function toSessionActivity(row: SessionActivityRow): SessionActivity {
  const activity: Activity = {
    id: row.activity_id,
    name: row.a_name,
    tag: row.a_tag ?? undefined,
    durationMinutes: row.a_duration_minutes ?? undefined,
    notes: row.a_notes ?? undefined,
    canvasData: JSON.parse(row.a_canvas_data) as CanvasData,
    thumbnailUri: row.a_thumbnail_uri ?? undefined,
    createdAt: row.a_created_at,
    updatedAt: row.a_updated_at,
  }

  return {
    id: row.id,
    activityId: row.activity_id,
    activity,
    position: row.position,
    blockType: row.block_type,
    coachingPoints: row.coaching_points ?? undefined,
    durationOverride: row.duration_override ?? undefined,
  }
}

function getSessionActivities(db: SQLiteDatabase, sessionId: string): SessionActivity[] {
  const rows = db.getAllSync<SessionActivityRow>(
    `SELECT
       sa.id, sa.session_id, sa.activity_id, sa.position, sa.block_type, sa.coaching_points, sa.duration_override,
       a.name AS a_name, a.tag AS a_tag, a.duration_minutes AS a_duration_minutes, a.notes AS a_notes,
       a.canvas_data AS a_canvas_data, a.thumbnail_uri AS a_thumbnail_uri,
       a.created_at AS a_created_at, a.updated_at AS a_updated_at
     FROM session_activities sa
     JOIN activities a ON a.id = sa.activity_id
     WHERE sa.session_id = ?
     ORDER BY sa.position ASC`,
    sessionId
  )
  return rows.map(toSessionActivity)
}

function toSession(db: SQLiteDatabase, row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    activities: getSessionActivities(db, row.id),
    totalDurationMinutes: row.total_duration_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function list(): Promise<Session[]> {
  const db = getDatabase()
  const rows = db.getAllSync<SessionRow>('SELECT * FROM sessions ORDER BY updated_at DESC')
  return rows.map((row) => toSession(db, row))
}

async function getById(id: string): Promise<Session | null> {
  const db = getDatabase()
  const row = db.getFirstSync<SessionRow>('SELECT * FROM sessions WHERE id = ?', id)
  return row ? toSession(db, row) : null
}

async function create(input: CreateSessionInput): Promise<Session> {
  const db = getDatabase()
  const now = new Date().toISOString()
  const session: Session = {
    id: randomUUID(),
    name: input.name,
    activities: [],
    totalDurationMinutes: 0,
    createdAt: now,
    updatedAt: now,
  }

  db.runSync(
    `INSERT INTO sessions (id, name, total_duration_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    session.id,
    session.name,
    session.totalDurationMinutes,
    session.createdAt,
    session.updatedAt
  )

  return session
}

async function update(id: string, patch: Partial<CreateSessionInput>): Promise<Session | null> {
  const db = getDatabase()
  const existing = await getById(id)
  if (!existing) return null

  const updatedAt = new Date().toISOString()
  const name = patch.name ?? existing.name

  db.runSync(
    'UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?',
    name,
    updatedAt,
    id
  )

  return { ...existing, name, updatedAt }
}

async function deleteSession(id: string): Promise<void> {
  const db = getDatabase()
  db.runSync('DELETE FROM sessions WHERE id = ?', id)
}

async function recalculateTotalDuration(db: SQLiteDatabase, sessionId: string): Promise<void> {
  const activities = getSessionActivities(db, sessionId)
  const total = activities.reduce(
    (sum, sa) => sum + (sa.durationOverride ?? sa.activity.durationMinutes ?? 0),
    0
  )
  db.runSync(
    'UPDATE sessions SET total_duration_minutes = ?, updated_at = ? WHERE id = ?',
    total,
    new Date().toISOString(),
    sessionId
  )
}

async function addActivity(
  sessionId: string,
  input: AddSessionActivityInput
): Promise<SessionActivity> {
  const db = getDatabase()
  const { maxPosition } = db.getFirstSync<{ maxPosition: number | null }>(
    'SELECT MAX(position) AS maxPosition FROM session_activities WHERE session_id = ?',
    sessionId
  )!
  const position = (maxPosition ?? -1) + 1
  const id = randomUUID()

  db.runSync(
    `INSERT INTO session_activities (id, session_id, activity_id, position, block_type, coaching_points, duration_override)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    sessionId,
    input.activityId,
    position,
    input.blockType,
    input.coachingPoints ?? null,
    input.durationOverride ?? null
  )

  await recalculateTotalDuration(db, sessionId)

  const row = db.getFirstSync<SessionActivityRow>(
    `SELECT
       sa.id, sa.session_id, sa.activity_id, sa.position, sa.block_type, sa.coaching_points, sa.duration_override,
       a.name AS a_name, a.tag AS a_tag, a.duration_minutes AS a_duration_minutes, a.notes AS a_notes,
       a.canvas_data AS a_canvas_data, a.thumbnail_uri AS a_thumbnail_uri,
       a.created_at AS a_created_at, a.updated_at AS a_updated_at
     FROM session_activities sa
     JOIN activities a ON a.id = sa.activity_id
     WHERE sa.id = ?`,
    id
  )!
  return toSessionActivity(row)
}

async function reorderActivities(sessionId: string, orderedSessionActivityIds: string[]): Promise<void> {
  const db = getDatabase()
  db.withTransactionSync(() => {
    orderedSessionActivityIds.forEach((sessionActivityId, index) => {
      db.runSync(
        'UPDATE session_activities SET position = ? WHERE id = ? AND session_id = ?',
        index,
        sessionActivityId,
        sessionId
      )
    })
  })
}

async function removeActivity(sessionId: string, sessionActivityId: string): Promise<void> {
  const db = getDatabase()
  db.runSync(
    'DELETE FROM session_activities WHERE id = ? AND session_id = ?',
    sessionActivityId,
    sessionId
  )
  await recalculateTotalDuration(db, sessionId)
}

export const sessionRepository = {
  list,
  getById,
  create,
  update,
  delete: deleteSession,
  addActivity,
  reorderActivities,
  removeActivity,
}
