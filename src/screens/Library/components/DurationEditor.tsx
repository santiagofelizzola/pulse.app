import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'

interface DurationEditorProps {
  visible: boolean
  initialValue: number | undefined
  onClose: () => void
  onSave: (minutes: number | undefined) => void
}

// Per-block duration override (SessionActivity.durationOverride) — set fresh on each block,
// independent of the source activity (which carries no duration of its own in this build).
export function DurationEditor({ visible, initialValue, onClose, onSave }: DurationEditorProps) {
  const [text, setText] = useState(initialValue ? String(initialValue) : '')

  useEffect(() => {
    if (visible) setText(initialValue ? String(initialValue) : '')
  }, [visible, initialValue])

  const parsed = parseInt(text, 10)
  const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Block duration">
      <Text style={styles.label}>Minutes</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="e.g. 15"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        style={styles.input}
        autoFocus
      />
      <Pressable
        onPress={() => {
          onSave(minutes)
          onClose()
        }}
        style={styles.saveButton}
      >
        <Text style={styles.saveLabel}>Save</Text>
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
  saveButton: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    ...typography.label,
    color: colors.onPrimary,
  },
})
