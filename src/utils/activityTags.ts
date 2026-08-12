import type { ActivityTag } from '../types'

export const ACTIVITY_TAG_OPTIONS: Array<{ value: ActivityTag; label: string }> = [
  { value: 'warm-up', label: 'Warm-up' },
  { value: 'technical', label: 'Technical' },
  { value: 'possession', label: 'Possession' },
  { value: 'pressing', label: 'Pressing' },
  { value: 'attacking', label: 'Attacking' },
  { value: 'defending', label: 'Defending' },
  { value: 'transition', label: 'Transition' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'set-piece', label: 'Set piece' },
]

export function activityTagLabel(tag: ActivityTag): string {
  return ACTIVITY_TAG_OPTIONS.find((option) => option.value === tag)?.label ?? tag
}
