import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import type { LineupPosition } from '../../../types'

interface PositionEditSheetProps {
  visible: boolean
  position: LineupPosition | null
  onClose: () => void
  onSave: (patch: { role?: string; label: string; shirtNumber?: number }) => void
}

const SHIRT_NUMBER_MAX_DIGITS = 2

// Position (role) and Number (shirtNumber) both render inside the marker — which one the coach
// actually sees is the lineup-wide labelDisplay, so both are editable here regardless of the
// current mode. Name (label) renders as the caption below the marker, per architecture.md's
// "Lineup marker labeling" decision.
export function PositionEditSheet({ visible, position, onClose, onSave }: PositionEditSheetProps) {
  const [role, setRole] = useState('')
  const [shirtNumber, setShirtNumber] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    if (visible && position) {
      setRole(position.role ?? '')
      setShirtNumber(position.shirtNumber != null ? String(position.shirtNumber) : '')
      setName(position.label)
    }
  }, [visible, position])

  const handleSave = () => {
    const parsedNumber = parseInt(shirtNumber, 10)
    onSave({
      role: role.trim() || undefined,
      // Cleared back to empty means "no number", which is also what makes this position eligible
      // for auto-assignment again the next time the lineup switches to number display.
      shirtNumber: Number.isNaN(parsedNumber) ? undefined : parsedNumber,
      label: name.trim(),
    })
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit player">
      <View style={styles.row}>
        <View style={styles.roleField}>
          <Text style={styles.label}>Position</Text>
          <TextInput
            value={role}
            onChangeText={setRole}
            placeholder="e.g. CB"
            placeholderTextColor={colors.textTertiary}
            maxLength={4}
            autoCapitalize="characters"
            style={styles.input}
            autoFocus
          />
        </View>

        <View style={styles.numberField}>
          <Text style={styles.label}>Number</Text>
          <TextInput
            value={shirtNumber}
            // Digits only rather than trusting the keypad — number-pad still exposes a paste
            // action, and some Android keyboards surface a decimal separator on it.
            onChangeText={(next) => setShirtNumber(next.replace(/[^0-9]/g, ''))}
            placeholder="9"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            maxLength={SHIRT_NUMBER_MAX_DIGITS}
            style={styles.input}
          />
        </View>
      </View>

      <Text style={styles.label}>Name (shown below the marker)</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Alex M."
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
      />

      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Text style={styles.saveLabel}>Save</Text>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  // Position and Number share a line: both are 1–4 characters, and stacking them would push the
  // Save button under the keyboard on a small phone.
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleField: {
    flex: 2,
  },
  numberField: {
    flex: 1,
  },
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
