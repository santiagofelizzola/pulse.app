import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'

interface CoachingPointsEditorProps {
  visible: boolean
  initialValue: string
  onClose: () => void
  onSave: (value: string) => void
}

// Coaching points are stored as one freeform string (SessionActivity.coachingPoints);
// each line becomes a bullet when the hybrid card renders the expanded list.
export function CoachingPointsEditor({ visible, initialValue, onClose, onSave }: CoachingPointsEditorProps) {
  const [text, setText] = useState(initialValue)

  useEffect(() => {
    if (visible) setText(initialValue)
  }, [visible, initialValue])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Coaching points">
      <Text style={styles.hint}>One point per line.</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={'e.g.\nFirst touch out of feet\nScan before receiving'}
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        multiline
        autoFocus
      />
      <Pressable
        onPress={() => {
          onSave(text.trim())
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
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 96,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
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
