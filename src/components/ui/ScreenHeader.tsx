import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, typography, spacing, layout } from '../../theme/theme'

interface ScreenHeaderProps {
  title: string
  trailing?: ReactNode
}

// Shared large-title header (design.md §Navigation Bar). The title row has a
// fixed minHeight of layout.touchTarget (the spec's "44 + safe-area top
// inset" content height) so the title sits at the same vertical position
// whether or not a trailing action is present.
export function ScreenHeader({ title, trailing }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
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
  return (
    <Pressable onPress={onPress} hitSlop={layout.hitSlop} style={styles.actionButton}>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
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
    justifyContent: 'space-between',
    minHeight: layout.touchTarget,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
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
