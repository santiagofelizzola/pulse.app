import { useState } from 'react'
import { Trash2 } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, layout, radius, spacing, typography } from '../../../theme/theme'
import type { Session } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface SessionListItemProps {
  session: Session
  onPress: () => void
  onDelete: () => void
}

export function SessionListItem({ session, onPress, onDelete }: SessionListItemProps) {
  const blockCount = session.activities.length
  // Reanimated cannot see through a function-form `style` prop, so the pressed background is
  // tracked as state rather than via Pressable's ({ pressed }) callback. Same styles, same values.
  const [pressed, setPressed] = useState(false)
  const row = usePressAnimation()
  const remove = usePressAnimation()

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        setPressed(true)
        row.onPressIn()
      }}
      onPressOut={() => {
        setPressed(false)
        row.onPressOut()
      }}
      style={[styles.row, pressed && styles.rowPressed, row.animatedStyle]}
    >
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {session.name}
        </Text>
        <Text style={styles.subtitle}>
          {session.totalDurationMinutes} min · {blockCount} {blockCount === 1 ? 'block' : 'blocks'}
        </Text>
      </View>
      <AnimatedPressable
        onPress={onDelete}
        onPressIn={remove.onPressIn}
        onPressOut={remove.onPressOut}
        hitSlop={layout.hitSlop}
        style={[styles.deleteButton, remove.animatedStyle]}
      >
        <Trash2 size={20} color={colors.error} />
      </AnimatedPressable>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  deleteButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
