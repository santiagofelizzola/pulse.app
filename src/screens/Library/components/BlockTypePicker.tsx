import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { BLOCK_TYPE_OPTIONS, blockTypeColor } from '../../../utils/blockTypes'
import type { BlockType } from '../../../types'

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
      {BLOCK_TYPE_OPTIONS.map((option) => {
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
            <View style={[styles.dot, { backgroundColor: blockTypeColor(option.value) }]} />
            <Text style={styles.label}>{option.label}</Text>
            {isSelected ? <Check size={18} color={colors.primary} /> : null}
          </Pressable>
        )
      })}
    </BottomSheet>
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
