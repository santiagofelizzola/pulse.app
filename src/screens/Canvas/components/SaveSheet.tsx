import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import type { ActivityTag } from '../../../types'

const TAG_OPTIONS: Array<{ value: ActivityTag; label: string }> = [
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

interface SaveSheetProps {
  visible: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (input: { name: string; tag?: ActivityTag }) => void
}

export function SaveSheet({ visible, saving, error, onClose, onSave }: SaveSheetProps) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState<ActivityTag | undefined>(undefined)

  useEffect(() => {
    if (visible) {
      setName('')
      setTag(undefined)
    }
  }, [visible])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !saving

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Save activity">
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Rondo warm-up"
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        autoFocus
      />

      <Text style={styles.label}>Tag (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {TAG_OPTIONS.map((option) => {
          const selected = tag === option.value
          return (
            <Pressable
              key={option.value}
              onPress={() => setTag(selected ? undefined : option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        disabled={!canSave}
        onPress={() => onSave({ name: trimmedName, tag })}
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save</Text>
        )}
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  chipRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
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
  error: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.md,
  },
  saveButton: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceSunken,
  },
  saveLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
  saveLabelDisabled: {
    color: colors.textDisabled,
  },
})
