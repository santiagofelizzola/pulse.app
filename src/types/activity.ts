import type { CanvasData } from './canvas'

export type ActivityTag =
  | 'warm-up' | 'technical' | 'possession' | 'pressing'
  | 'attacking' | 'defending' | 'transition' | 'finishing' | 'set-piece'

export interface Activity {
  id: string                 // device-generated uuid
  name: string
  tag?: ActivityTag
  durationMinutes?: number
  notes?: string
  playerCount?: number
  playerActions?: string     // free text — what players do in the drill; distinct from `notes`
  canvasData: CanvasData
  thumbnailUri?: string      // local file path (expo-file-system), generated on save
  createdAt: string
  updatedAt: string
}

export interface CreateActivityInput {
  name: string
  tag?: ActivityTag
  durationMinutes?: number
  notes?: string
  playerCount?: number
  playerActions?: string
  canvasData: CanvasData
  thumbnailUri?: string      // local file path (expo-file-system), generated on save
}
