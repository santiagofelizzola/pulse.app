import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, spacing, typography } from '../../../theme/theme'
import { getFormationOptions } from '../../../utils/formationSlots'
import type { Formation, SquadSize } from '../../../types'

interface FormationPickerProps {
  visible: boolean
  squadSize: SquadSize
  selected: Formation | undefined
  onSelect: (formation: Formation) => void
  onClose: () => void
}

export function FormationPicker({ visible, squadSize, selected, onSelect, onClose }: FormationPickerProps) {
  const options = getFormationOptions(squadSize)

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Formation">
      {options.map((option) => {
        const isSelected = option.value === selected
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              onSelect(option.value)
              onClose()
            }}
            style={styles.row}
          >
            <Text style={styles.label}>{option.label}</Text>
            {isSelected ? <Check size={18} color={colors.primary} /> : null}
          </Pressable>
        )
      })}
      <View style={{ height: spacing.sm }} />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
})
