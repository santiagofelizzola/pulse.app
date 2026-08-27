import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'
import Animated from 'react-native-reanimated'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import type { SubEntry } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface SubEditSheetProps {
  visible: boolean
  sub: SubEntry | null
  onClose: () => void
  onSave: (patch: { name: string; position?: string }) => void
  onRemove: () => void
}

// A sub is a name + optional position, distinct from the on-pitch LineupPositions — no marker,
// no x/y, just a roster entry (see architecture.md's "Lineups — add subs" scope).
export function SubEditSheet({ visible, sub, onClose, onSave, onRemove }: SubEditSheetProps) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')

  useEffect(() => {
    if (visible) {
      setName(sub?.name ?? '')
      setPosition(sub?.position ?? '')
    }
  }, [visible, sub])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0
  const savePress = usePressAnimation()
  const removePress = usePressAnimation()

  return (
    <BottomSheet visible={visible} onClose={onClose} title={sub ? 'Edit sub' : 'Add sub'}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Alex M."
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        autoFocus
      />

      <Text style={styles.label}>Position (optional)</Text>
      <TextInput
        value={position}
        onChangeText={setPosition}
        placeholder="e.g. CB or 9"
        placeholderTextColor={colors.textTertiary}
        maxLength={4}
        autoCapitalize="characters"
        style={styles.input}
      />

      <AnimatedPressable
        disabled={!canSave}
        onPress={() => {
          onSave({ name: trimmedName, position: position.trim() || undefined })
          onClose()
        }}
        onPressIn={savePress.onPressIn}
        onPressOut={savePress.onPressOut}
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled, savePress.animatedStyle]}
      >
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save</Text>
      </AnimatedPressable>

      {sub ? (
        <AnimatedPressable
          onPress={() => {
            onRemove()
            onClose()
          }}
          onPressIn={removePress.onPressIn}
          onPressOut={removePress.onPressOut}
          style={[styles.removeButton, removePress.animatedStyle]}
        >
          <Text style={styles.removeLabel}>Remove sub</Text>
        </AnimatedPressable>
      ) : null}
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
  removeButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  removeLabel: {
    ...typography.label,
    color: colors.error,
  },
})
