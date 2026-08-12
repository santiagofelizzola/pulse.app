import { colors } from '../theme/theme'
import type { BlockType } from '../types'

export const BLOCK_TYPE_OPTIONS: Array<{ value: BlockType; label: string }> = [
  { value: 'warm-up', label: 'Warm-up' },
  { value: 'technical', label: 'Technical' },
  { value: 'possession', label: 'Possession' },
  { value: 'pressing', label: 'Pressing' },
  { value: 'attacking', label: 'Attacking' },
  { value: 'defending', label: 'Defending' },
  { value: 'transition', label: 'Transition' },
  { value: 'game', label: 'Game' },
]

const BLOCK_COLOR: Record<BlockType, string> = {
  'warm-up': colors.block.warmup,
  technical: colors.block.technical,
  possession: colors.block.possession,
  pressing: colors.block.pressing,
  attacking: colors.block.attacking,
  defending: colors.block.defending,
  transition: colors.block.transition,
  game: colors.block.game,
}

export function blockTypeColor(type: BlockType): string {
  return BLOCK_COLOR[type]
}

export function blockTypeLabel(type: BlockType): string {
  return BLOCK_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}
