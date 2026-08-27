import { Pressable, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Check } from 'lucide-react-native'

import { BottomSheet } from '../../../components/ui/BottomSheet'
import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing } from '../../../theme/theme'
import { OBJECT_COLOR_SWATCHES } from '../../../utils/canvasUtils'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

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
        {OBJECT_COLOR_SWATCHES.map((color) => (
          <Swatch
            key={color}
            color={color}
            isSelected={color.toLowerCase() === (selectedColor ?? '').toLowerCase()}
            onPress={() => onSelect(color)}
          />
        ))}
      </View>
    </BottomSheet>
  )
}

// Its own component only so each swatch can hold a press animation of its own — a hook can't be
// called inside the map above. Renders exactly the Pressable it replaced.
function Swatch({ color, isSelected, onPress }: { color: string; isSelected: boolean; onPress: () => void }) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      accessibilityLabel={color}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.swatchWrapper, press.animatedStyle]}
    >
      <View style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}>
        {isSelected ? <Check size={18} color={colors.textInverse} /> : null}
      </View>
    </AnimatedPressable>
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
