import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { SQUAD_SIZE_OPTIONS } from '../../../utils/formationSlots'
import type { SquadSize } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface SquadSizePickerProps {
  onSelect: (squadSize: SquadSize) => void
}

// First step of a new lineup — full-bleed like an empty state (design.md §9), not a sheet,
// since it's the entry decision rather than a contextual pick.
export function SquadSizePicker({ onSelect }: SquadSizePickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Squad size</Text>
      <Text style={styles.supporting}>Pick the format for this lineup.</Text>
      <View style={styles.options}>
        {SQUAD_SIZE_OPTIONS.map((option) => (
          <SquadSizeOption key={option.value} label={option.label} onPress={() => onSelect(option.value)} />
        ))}
      </View>
    </View>
  )
}

// Its own component only so each option can hold a press animation of its own — a hook can't be
// called inside the map above. Renders exactly the Pressable it replaced; `pressed` moves to state
// because reanimated cannot see through a function-form `style` prop.
function SquadSizeOption({ label, onPress }: { label: string; onPress: () => void }) {
  const [pressed, setPressed] = useState(false)
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        setPressed(true)
        press.onPressIn()
      }}
      onPressOut={() => {
        setPressed(false)
        press.onPressOut()
      }}
      style={[styles.option, pressed && styles.optionPressed, press.animatedStyle]}
    >
      <Text style={styles.optionLabel}>{label}</Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxxl,
  },
  headline: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  supporting: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  options: {
    width: '100%',
    gap: spacing.md,
  },
  option: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPressed: {
    backgroundColor: colors.surfaceHover,
  },
  optionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
})
