import type { Activity } from './activity'

export type BlockType =
  | 'warm-up' | 'technical' | 'possession' | 'pressing'
  | 'attacking' | 'defending' | 'transition' | 'game'

export interface SessionActivity {
  id: string
  activityId: string
  activity: Activity
  position: number
  blockType: BlockType       // assigned per session block, not on the activity
  coachingPoints?: string    // assigned per session block, not on the activity
  durationOverride?: number
}

export interface Session {
  id: string                 // device-generated uuid
  name: string
  focus?: string
  playerCount?: number       // session-level default; activities keep their own independent playerCount
  coachingMoments?: string   // session-level; distinct from the per-block `coachingPoints` on SessionActivity
  activities: SessionActivity[]
  totalDurationMinutes: number
  createdAt: string
  updatedAt: string
}

export interface CreateSessionInput {
  name: string
  focus?: string
  playerCount?: number
  coachingMoments?: string
}

export interface AddSessionActivityInput {
  activityId: string
  blockType: BlockType
  coachingPoints?: string
  durationOverride?: number
}
