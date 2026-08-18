import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { motion } from '../../theme/theme'

const PRESSED_SCALE = 0.98
const PRESSED_OPACITY = 0.96

/**
 * Whether the OS asks us to avoid animation. design.md §10 makes this non-optional: when reduce
 * motion is on, durations drop to zero rather than transitions being merely shortened.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return reduceMotion
}

/**
 * design.md §10's press feedback — scale to 0.98 with a slight opacity drop over motion.fast.
 *
 * The spec calls this "the single most important micro-interaction", and it was missing from all
 * 177 Pressables in the app; the handful that reacted at all only changed background colour. This
 * hook is what every interactive primitive uses so the response is identical everywhere.
 */
export function usePressAnimation(enabled = true) {
  const pressed = useSharedValue(0)
  const reduceMotion = useReduceMotion()

  const duration = reduceMotion ? 0 : motion.fast

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - PRESSED_SCALE) }],
    opacity: 1 - pressed.value * (1 - PRESSED_OPACITY),
  }))

  return {
    animatedStyle,
    onPressIn: () => {
      if (enabled) pressed.value = withTiming(1, { duration })
    },
    onPressOut: () => {
      pressed.value = withTiming(0, { duration })
    },
  }
}
