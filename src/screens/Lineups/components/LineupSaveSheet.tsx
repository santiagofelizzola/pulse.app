import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'

interface LineupSaveSheetProps {
  visible: boolean
  initialName: string
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (name: string) => void
}

// Name is the lineup's only identifier alongside squad size + formation — no match date (see
// architecture.md's "Lineup match date" decision).
export function LineupSaveSheet({ visible, initialName, saving, error, onClose, onSave }: LineupSaveSheetProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (visible) setName(initialName)
  }, [visible, initialName])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && !saving

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Save lineup">
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Saturday starters"
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        disabled={!canSave}
        onPress={() => onSave(trimmedName)}
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
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
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
