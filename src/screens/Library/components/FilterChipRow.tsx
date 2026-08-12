import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import { colors, layout, radius, spacing, typography } from '../../../theme/theme'
import { ACTIVITY_TAG_OPTIONS } from '../../../utils/activityTags'
import type { ActivityTag } from '../../../types'

interface FilterChipRowProps {
  selected: ActivityTag | undefined
  onSelect: (tag: ActivityTag | undefined) => void
}

// Shared between the Drills grid and the Session Builder's activity picker, keyed off
// ActivityTag (design.md §6: standard filter-chip treatment, not per-tag colors).
export function FilterChipRow({ selected, onSelect }: FilterChipRowProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="All" selected={selected === undefined} onPress={() => onSelect(undefined)} />
      {ACTIVITY_TAG_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={selected === option.value}
          onPress={() => onSelect(selected === option.value ? undefined : option.value)}
        />
      ))}
    </ScrollView>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
  },
  chip: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: 'transparent',
  },
  chipLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.primary,
  },
})
