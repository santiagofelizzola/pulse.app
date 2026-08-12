import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { ACTIVITY_TAG_OPTIONS } from '../../../utils/activityTags'
import type { ActivityTag } from '../../../types'

interface SaveSheetProps {
  visible: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (input: { name: string; tag?: ActivityTag; playerCount?: number; playerActions?: string }) => void
}

export function SaveSheet({ visible, saving, error, onClose, onSave }: SaveSheetProps) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState<ActivityTag | undefined>(undefined)
  const [playerCountText, setPlayerCountText] = useState('')
  const [playerActions, setPlayerActions] = useState('')

  useEffect(() => {
    if (visible) {
      setName('')
      setTag(undefined)
      setPlayerCountText('')
      setPlayerActions('')
    }
  }, [visible])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !saving
  const parsedPlayerCount = parseInt(playerCountText, 10)
  const playerCount = Number.isFinite(parsedPlayerCount) && parsedPlayerCount > 0 ? parsedPlayerCount : undefined

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
        {ACTIVITY_TAG_OPTIONS.map((option) => {
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

      <Text style={styles.label}>Player count (optional)</Text>
      <TextInput
        value={playerCountText}
        onChangeText={setPlayerCountText}
        placeholder="e.g. 8"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Player actions (optional)</Text>
      <TextInput
        value={playerActions}
        onChangeText={setPlayerActions}
        placeholder="What do players do in this drill?"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, styles.multilineInput]}
        multiline
        textAlignVertical="top"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        disabled={!canSave}
        onPress={() => onSave({ name: trimmedName, tag, playerCount, playerActions: playerActions.trim() || undefined })}
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
  multilineInput: {
    height: undefined,
    minHeight: 96,
    paddingVertical: 12,
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
