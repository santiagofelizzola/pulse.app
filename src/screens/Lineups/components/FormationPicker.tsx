import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, spacing, typography } from '../../../theme/theme'
import { getFormationOptions } from '../../../utils/formationSlots'
import type { Formation, SquadSize } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

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
      {options.map((option) => (
        <FormationRow
          key={option.value}
          label={option.label}
          isSelected={option.value === selected}
          onPress={() => {
            onSelect(option.value)
            onClose()
          }}
        />
      ))}
      <View style={{ height: spacing.sm }} />
    </BottomSheet>
  )
}

// Its own component only so each row can hold a press animation of its own — a hook can't be
// called inside the map above. Renders exactly the Pressable it replaced.
function FormationRow({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.row, press.animatedStyle]}
    >
      <Text style={styles.label}>{label}</Text>
      {isSelected ? <Check size={18} color={colors.primary} /> : null}
    </AnimatedPressable>
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
