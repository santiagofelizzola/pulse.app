import { randomUUID } from 'expo-crypto'

import { getDatabase } from '../database'
import { sessionsUsingActivity } from './sessionRepository'
import { resolveCanvasBackground } from '../../utils/canvasBackgrounds'
import { resolveThumbnailUri, thumbnailFilename } from '../../utils/thumbnailUtils'
import type { Activity, CreateActivityInput, ActivityTag, CanvasData, SessionUsage } from '../../types'

// Thrown by delete() instead of letting SQLite's own refusal escape. session_activities.activity_id
// declares no ON DELETE clause, so the constraint already blocks this delete — but it surfaces as an
// opaque "Error code 19: FOREIGN KEY constraint failed" that no screen can turn into a sentence.
// This carries the blocking sessions, so the caller can name them.
export class ActivityInUseError extends Error {
  readonly usedBy: SessionUsage[]

  constructor(usedBy: SessionUsage[]) {
    super(`Activity is used in ${usedBy.length} session(s)`)
    this.name = 'ActivityInUseError'
    this.usedBy = usedBy
  }
}

interface ActivityRow {
  id: string
  name: string
  tag: ActivityTag | null
  duration_minutes: number | null
  notes: string | null
  player_count: number | null
  player_actions: string | null
  canvas_data: string
  thumbnail_uri: string | null
  created_at: string
  updated_at: string
}

// The stored JSON is trusted for everything except `background`, which is a string union that
// has lost a member ('middle-third'). Guarded rather than cast, the same rule pitch_style and
// marker_style follow in lineupRepository: a value the renderer can't resolve falls back instead
// of failing to draw. Deliberately narrow — this is not a validator for the whole canvas.
function toCanvasData(raw: string): CanvasData {
  const parsed = JSON.parse(raw) as CanvasData
  return { ...parsed, background: resolveCanvasBackground(parsed.background) }
}

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    notes: row.notes ?? undefined,
    playerCount: row.player_count ?? undefined,
    playerActions: row.player_actions ?? undefined,
    canvasData: toCanvasData(row.canvas_data),
    thumbnailUri: row.thumbnail_uri ? resolveThumbnailUri(row.thumbnail_uri) : undefined,
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
  // input.thumbnailUri is the bare filename captureCanvasThumbnail returns — that's what gets
  // persisted. The in-memory Activity we return holds the resolved, render-ready URI instead,
  // so it's consistent with what getById/list hand back.
  const storedThumbnail = input.thumbnailUri ?? null

  const activity: Activity = {
    id: randomUUID(),
    name: input.name,
    tag: input.tag,
    durationMinutes: input.durationMinutes,
    notes: input.notes,
    playerCount: input.playerCount,
    playerActions: input.playerActions,
    canvasData: input.canvasData,
    thumbnailUri: storedThumbnail ? resolveThumbnailUri(storedThumbnail) : undefined,
    createdAt: now,
    updatedAt: now,
  }

  db.runSync(
    `INSERT INTO activities (id, name, tag, duration_minutes, notes, player_count, player_actions, canvas_data, thumbnail_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    activity.id,
    activity.name,
    activity.tag ?? null,
    activity.durationMinutes ?? null,
    activity.notes ?? null,
    activity.playerCount ?? null,
    activity.playerActions ?? null,
    JSON.stringify(activity.canvasData),
    storedThumbnail,
    activity.createdAt,
    activity.updatedAt
  )

  return activity
}

async function update(id: string, patch: Partial<CreateActivityInput>): Promise<Activity | null> {
  const db = getDatabase()
  const existing = await getById(id)
  if (!existing) return null

  // patch.thumbnailUri, when provided, is a bare filename (same contract as CreateActivityInput).
  // When omitted, existing.thumbnailUri is the already-resolved absolute URI from getById — it
  // must be reduced back to a bare filename before writing, or we'd re-persist an absolute path
  // and reintroduce the container-UUID staleness this fix removes.
  const storedThumbnail =
    patch.thumbnailUri !== undefined
      ? patch.thumbnailUri
      : existing.thumbnailUri
        ? thumbnailFilename(existing.thumbnailUri)
        : null

  const updated: Activity = {
    ...existing,
    ...patch,
    thumbnailUri: storedThumbnail ? resolveThumbnailUri(storedThumbnail) : undefined,
    updatedAt: new Date().toISOString(),
  }

  db.runSync(
    `UPDATE activities
     SET name = ?, tag = ?, duration_minutes = ?, notes = ?, player_count = ?, player_actions = ?, canvas_data = ?, thumbnail_uri = ?, updated_at = ?
     WHERE id = ?`,
    updated.name,
    updated.tag ?? null,
    updated.durationMinutes ?? null,
    updated.notes ?? null,
    updated.playerCount ?? null,
    updated.playerActions ?? null,
    JSON.stringify(updated.canvasData),
    storedThumbnail,
    updated.updatedAt,
    id
  )

  return updated
}

// What is holding a delete up, or an empty list when the activity is free to remove. Screens call
// this before confirming, so a delete that cannot succeed is never presented as a decision.
async function usage(id: string): Promise<SessionUsage[]> {
  const db = getDatabase()
  return sessionsUsingActivity(db, id)
}

// Refuses in-repository rather than leaving it to the foreign key: same outcome, but with the
// blocking sessions attached to the error. Check and delete share one transaction so the guard
// can't go stale between them, and the constraint stays underneath as the backstop.
//
// Callers must handle ActivityInUseError — this is not a delete that always succeeds.
async function deleteActivity(id: string): Promise<void> {
  const db = getDatabase()
  db.withTransactionSync(() => {
    const usedBy = sessionsUsingActivity(db, id)
    if (usedBy.length > 0) throw new ActivityInUseError(usedBy)
    db.runSync('DELETE FROM activities WHERE id = ?', id)
  })
}

export const activityRepository = {
  list,
  getById,
  create,
  update,
  usage,
  delete: deleteActivity,
}
