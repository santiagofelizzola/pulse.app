import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { colors, radius, spacing, typography } from '../../theme/theme'
import { usePressAnimation } from './usePressAnimation'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface SegmentedToggleProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}

// Not spec'd by design.md as its own component — built from the filter-chip treatment
// (§6 Tag/Chip) so it reads as part of the same visual language rather than a new pattern.
export function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Segment
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  )
}

// Its own component only so each segment can hold a press animation of its own — a hook can't be
// called inside the map above. Renders exactly the Pressable it replaced. (Same shape as
// FilterChipRow's Chip.)
function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.segment, selected && styles.segmentSelected, press.animatedStyle]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: 'transparent',
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.primary,
  },
})
