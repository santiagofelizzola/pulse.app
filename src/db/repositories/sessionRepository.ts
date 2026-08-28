import { randomUUID } from 'expo-crypto'
import type { SQLiteDatabase } from 'expo-sqlite'

import { getDatabase } from '../database'
import { resolveThumbnailUri } from '../../utils/thumbnailUtils'
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
  focus: string | null
  player_count: number | null
  coaching_moments: string | null
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
  a_player_count: number | null
  a_player_actions: string | null
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
    playerCount: row.a_player_count ?? undefined,
    playerActions: row.a_player_actions ?? undefined,
    canvasData: JSON.parse(row.a_canvas_data) as CanvasData,
    thumbnailUri: row.a_thumbnail_uri ? resolveThumbnailUri(row.a_thumbnail_uri) : undefined,
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
       a.player_count AS a_player_count, a.player_actions AS a_player_actions,
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
    focus: row.focus ?? undefined,
    playerCount: row.player_count ?? undefined,
    coachingMoments: row.coaching_moments ?? undefined,
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
    focus: input.focus,
    playerCount: input.playerCount,
    coachingMoments: input.coachingMoments,
    activities: [],
    totalDurationMinutes: 0,
    createdAt: now,
    updatedAt: now,
  }

  db.runSync(
    `INSERT INTO sessions (id, name, focus, player_count, coaching_moments, total_duration_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id,
    session.name,
    session.focus ?? null,
    session.playerCount ?? null,
    session.coachingMoments ?? null,
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
  const focus = patch.focus ?? existing.focus
  const playerCount = patch.playerCount ?? existing.playerCount
  const coachingMoments = patch.coachingMoments ?? existing.coachingMoments

  db.runSync(
    'UPDATE sessions SET name = ?, focus = ?, player_count = ?, coaching_moments = ?, updated_at = ? WHERE id = ?',
    name,
    focus ?? null,
    playerCount ?? null,
    coachingMoments ?? null,
    updatedAt,
    id
  )

  return { ...existing, name, focus, playerCount, coachingMoments, updatedAt }
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
       a.player_count AS a_player_count, a.player_actions AS a_player_actions,
       a.canvas_data AS a_canvas_data, a.thumbnail_uri AS a_thumbnail_uri,
       a.created_at AS a_created_at, a.updated_at AS a_updated_at
     FROM session_activities sa
     JOIN activities a ON a.id = sa.activity_id
     WHERE sa.id = ?`,
    id
  )!
  return toSessionActivity(row)
}

function currentPositionOrder(db: SQLiteDatabase, sessionId: string): string[] {
  const rows = db.getAllSync<{ id: string }>(
    'SELECT id FROM session_activities WHERE session_id = ? ORDER BY position ASC',
    sessionId
  )
  return rows.map((row) => row.id)
}

// Writes positions 0..n-1 onto `orderedIds`, which must be every row in the session.
//
// UNIQUE(session_id, position) is checked after each statement and SQLite has no deferred form
// for a non-FK constraint, so a row can't take a position a sibling still holds. Every renumbering
// therefore runs in two phases: park all the rows above the highest position currently in use,
// then write the final positions into the range that just emptied. Callers must already be inside
// a transaction, so the parked range is never visible to a reader and a failure rolls back whole.
function writePositions(db: SQLiteDatabase, sessionId: string, orderedIds: string[]): void {
  const { maxPosition } = db.getFirstSync<{ maxPosition: number | null }>(
    'SELECT MAX(position) AS maxPosition FROM session_activities WHERE session_id = ?',
    sessionId
  )!
  const parkBase = (maxPosition ?? -1) + 1

  orderedIds.forEach((id, index) => {
    db.runSync(
      'UPDATE session_activities SET position = ? WHERE id = ? AND session_id = ?',
      parkBase + index,
      id,
      sessionId
    )
  })
  orderedIds.forEach((id, index) => {
    db.runSync(
      'UPDATE session_activities SET position = ? WHERE id = ? AND session_id = ?',
      index,
      id,
      sessionId
    )
  })
}

async function reorderActivities(sessionId: string, orderedSessionActivityIds: string[]): Promise<void> {
  const db = getDatabase()
  db.withTransactionSync(() => {
    // The stored rows are the authority on what the session contains, not the caller's list: the
    // screen reorders optimistically from state that can be a beat behind. Ids it doesn't know
    // about keep their relative order and land after the ones it does, and ids it names that no
    // longer exist are dropped — so every surviving row still gets exactly one of 0..n-1.
    const existing = currentPositionOrder(db, sessionId)
    const existingIds = new Set(existing)
    const requested: string[] = []
    const claimed = new Set<string>()
    for (const id of orderedSessionActivityIds) {
      if (existingIds.has(id) && !claimed.has(id)) {
        claimed.add(id)
        requested.push(id)
      }
    }
    writePositions(db, sessionId, [...requested, ...existing.filter((id) => !claimed.has(id))])
  })
}

async function removeActivity(sessionId: string, sessionActivityId: string): Promise<void> {
  const db = getDatabase()
  db.withTransactionSync(() => {
    db.runSync(
      'DELETE FROM session_activities WHERE id = ? AND session_id = ?',
      sessionActivityId,
      sessionId
    )
    // Compact the survivors back onto 0..n-1 in the same transaction. A gap would never break a
    // read (they're only ever ordered by, never indexed by), but it would leave `position` out of
    // step with the block's index, and addActivity's MAX(position)+1 drifting past the block count.
    writePositions(db, sessionId, currentPositionOrder(db, sessionId))
  })
  await recalculateTotalDuration(db, sessionId)
}

async function updateActivity(
  sessionId: string,
  sessionActivityId: string,
  // durationOverride: number sets it, null explicitly clears it, undefined (or the key
  // omitted) leaves it unchanged — distinct from coachingPoints/blockType, which have no
  // "unset" state worth representing separately from their default.
  patch: { blockType?: BlockType; coachingPoints?: string; durationOverride?: number | null }
): Promise<SessionActivity | null> {
  const db = getDatabase()
  const row = db.getFirstSync<SessionActivityRow>(
    `SELECT sa.id, sa.session_id, sa.activity_id, sa.position, sa.block_type, sa.coaching_points, sa.duration_override,
            a.name AS a_name, a.tag AS a_tag, a.duration_minutes AS a_duration_minutes, a.notes AS a_notes,
            a.player_count AS a_player_count, a.player_actions AS a_player_actions,
       a.canvas_data AS a_canvas_data, a.thumbnail_uri AS a_thumbnail_uri,
            a.created_at AS a_created_at, a.updated_at AS a_updated_at
     FROM session_activities sa
     JOIN activities a ON a.id = sa.activity_id
     WHERE sa.id = ? AND sa.session_id = ?`,
    sessionActivityId,
    sessionId
  )
  if (!row) return null

  const blockType = patch.blockType ?? row.block_type
  const coachingPoints = patch.coachingPoints !== undefined ? patch.coachingPoints : (row.coaching_points ?? undefined)
  const durationOverride =
    patch.durationOverride === undefined ? (row.duration_override ?? undefined) : (patch.durationOverride ?? undefined)

  db.runSync(
    'UPDATE session_activities SET block_type = ?, coaching_points = ?, duration_override = ? WHERE id = ? AND session_id = ?',
    blockType,
    coachingPoints ?? null,
    durationOverride ?? null,
    sessionActivityId,
    sessionId
  )

  if (patch.durationOverride !== undefined) {
    await recalculateTotalDuration(db, sessionId)
  }

  return toSessionActivity({
    ...row,
    block_type: blockType,
    coaching_points: coachingPoints ?? null,
    duration_override: durationOverride ?? null,
  })
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
  updateActivity,
}
