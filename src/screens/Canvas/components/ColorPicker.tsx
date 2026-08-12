import { Pressable, StyleSheet, View } from 'react-native'
import { Check } from 'lucide-react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { colors, radius, spacing } from '../../../theme/theme'
import { OBJECT_COLOR_SWATCHES } from '../../../utils/canvasUtils'

interface ColorPickerProps {
  visible: boolean
  selectedColor?: string
  onSelect: (color: string) => void
  onClose: () => void
}

const SWATCH_SIZE = 44

// Preset swatches only (design.md's "simple color picker" allowance) — this is the selection
// toolbar's deferred "color" action for cone/disc, wired to their existing `color` field.
export function ColorPicker({ visible, selectedColor, onSelect, onClose }: ColorPickerProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Color">
      <View style={styles.row}>
        {OBJECT_COLOR_SWATCHES.map((color) => {
          const isSelected = color.toLowerCase() === (selectedColor ?? '').toLowerCase()
          return (
            <Pressable key={color} accessibilityLabel={color} onPress={() => onSelect(color)} style={styles.swatchWrapper}>
              <View style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}>
                {isSelected ? <Check size={18} color={colors.textInverse} /> : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatchWrapper: {
    width: SWATCH_SIZE + spacing.sm,
    height: SWATCH_SIZE + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
})
