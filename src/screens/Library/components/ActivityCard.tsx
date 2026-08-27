import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { colors, radius, spacing, typography } from '../../../theme/theme'
import { activityTagLabel } from '../../../utils/activityTags'
import type { Activity } from '../../../types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface ActivityCardProps {
  activity: Activity
  onPress: () => void
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  // A stored thumbnail_uri doesn't guarantee the file is still reachable (e.g. a stale path from
  // before migration 005) — fall back to the placeholder instead of leaving a broken image.
  const [imageFailed, setImageFailed] = useState(false)
  // Reanimated cannot see through a function-form `style` prop (it flattens it to `[fn]` and
  // drops it), so the pressed background is tracked as state here instead of via Pressable's
  // ({ pressed }) callback. Same styles, same values — only how `pressed` is obtained changes.
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
      style={[styles.card, pressed && styles.cardPressed, press.animatedStyle]}
    >
      {activity.thumbnailUri && !imageFailed ? (
        <Image
          source={{ uri: activity.thumbnailUri }}
          style={styles.thumbnail}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {activity.name}
        </Text>
        {activity.tag ? (
          <Text style={styles.tag} numberOfLines={1}>
            {activityTagLabel(activity.tag)}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardPressed: {
    // Scale is no longer set here — usePressAnimation drives it (design.md §10's 0.98) so every
    // pressable in the app responds identically.
    backgroundColor: colors.surfaceHover,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceSunken,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceSunken,
  },
  body: {
    padding: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  tag: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
})
