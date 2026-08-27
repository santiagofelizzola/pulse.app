import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { colors, typography, spacing, layout } from '../../theme/theme'
import { usePressAnimation } from './usePressAnimation'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface ScreenHeaderProps {
  title: string
  trailing?: ReactNode
  onBack?: () => void
}

// Shared large-title header (design.md §Navigation Bar). The title row has a
// fixed minHeight of layout.touchTarget (the spec's "44 + safe-area top
// inset" content height) so the title sits at the same vertical position
// whether or not a trailing action is present. `onBack` adds the spec's
// chevron-24 back button (colors.primary) for pushed (non-tab-root) screens.
export function ScreenHeader({ title, trailing, onBack }: ScreenHeaderProps) {
  const back = usePressAnimation()

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {onBack ? (
          <AnimatedPressable
            onPress={onBack}
            onPressIn={back.onPressIn}
            onPressOut={back.onPressOut}
            hitSlop={layout.hitSlop}
            style={[styles.backButton, back.animatedStyle]}
          >
            <ChevronLeft size={24} color={colors.primary} />
          </AnimatedPressable>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {trailing}
      </View>
    </View>
  )
}

interface HeaderActionButtonProps {
  label: string
  onPress: () => void
}

// A single trailing header action: touch target layout.touchTarget (44),
// matching design.md's "up to 2 icon buttons, 24 icon, 44 touch target".
export function HeaderActionButton({ label, onPress }: HeaderActionButtonProps) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={layout.hitSlop}
      style={[styles.actionButton, press.animatedStyle]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.touchTarget,
  },
  backButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -layout.hitSlop,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    flex: 1,
  },
  actionButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.h2,
    color: colors.primary,
  },
})
