import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import type { LineupPosition } from '../../../types'

interface PositionEditSheetProps {
  visible: boolean
  position: LineupPosition | null
  onClose: () => void
  onSave: (patch: { role?: string; label: string }) => void
}

// Position (role) renders inside the marker circle; Name (label) renders as the caption below
// it — two distinct concepts per architecture.md's "Lineup marker labeling" decision.
export function PositionEditSheet({ visible, position, onClose, onSave }: PositionEditSheetProps) {
  const [role, setRole] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    if (visible && position) {
      setRole(position.role ?? '')
      setName(position.label)
    }
  }, [visible, position])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit player">
      <Text style={styles.label}>Marker text — position or number (shown on the marker)</Text>
      <TextInput
        value={role}
        onChangeText={setRole}
        placeholder="e.g. CB or 9"
        placeholderTextColor={colors.textTertiary}
        maxLength={4}
        autoCapitalize="characters"
        style={styles.input}
        autoFocus
      />

      <Text style={styles.label}>Name (shown below the marker)</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Alex M."
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
      />

      <Pressable
        onPress={() => {
          onSave({ role: role.trim() || undefined, label: name.trim() })
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
    paddingVertical: 12,
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
