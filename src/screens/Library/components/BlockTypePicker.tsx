import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { BLOCK_TYPE_OPTIONS, blockTypeColor } from '../../../utils/blockTypes'
import type { BlockType } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface BlockTypePickerProps {
  visible: boolean
  selected: BlockType | undefined
  onSelect: (type: BlockType) => void
  onClose: () => void
}

// design.md §6's "minimal dot + label form" for block-type tags, preferred inside dense lists.
export function BlockTypePicker({ visible, selected, onSelect, onClose }: BlockTypePickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Block type">
      {BLOCK_TYPE_OPTIONS.map((option) => (
        <BlockTypeRow
          key={option.value}
          label={option.label}
          color={blockTypeColor(option.value)}
          isSelected={option.value === selected}
          onPress={() => {
            onSelect(option.value)
            onClose()
          }}
        />
      ))}
    </BottomSheet>
  )
}

// Its own component only so each row can hold a press animation of its own — a hook can't be
// called inside the map above. Renders exactly the Pressable it replaced.
function BlockTypeRow({
  label,
  color,
  isSelected,
  onPress,
}: {
  label: string
  color: string
  isSelected: boolean
  onPress: () => void
}) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.row, press.animatedStyle]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      {isSelected ? <Check size={18} color={colors.primary} /> : null}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    marginRight: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
  },
})
