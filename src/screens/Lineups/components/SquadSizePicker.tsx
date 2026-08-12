import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '../../../theme/theme'
import { SQUAD_SIZE_OPTIONS } from '../../../utils/formationSlots'
import type { SquadSize } from '../../../types'

interface SquadSizePickerProps {
  onSelect: (squadSize: SquadSize) => void
}

// First step of a new lineup — full-bleed like an empty state (design.md §9), not a sheet,
// since it's the entry decision rather than a contextual pick.
export function SquadSizePicker({ onSelect }: SquadSizePickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Squad size</Text>
      <Text style={styles.supporting}>Pick the format for this lineup.</Text>
      <View style={styles.options}>
        {SQUAD_SIZE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxxl,
  },
  headline: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  supporting: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  options: {
    width: '100%',
    gap: spacing.md,
  },
  option: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPressed: {
    backgroundColor: colors.surfaceHover,
  },
  optionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
})
