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
  activities: SessionActivity[]
  totalDurationMinutes: number
  createdAt: string
  updatedAt: string
}

export interface CreateSessionInput {
  name: string
}

export interface AddSessionActivityInput {
  activityId: string
  blockType: BlockType
  coachingPoints?: string
  durationOverride?: number
}
