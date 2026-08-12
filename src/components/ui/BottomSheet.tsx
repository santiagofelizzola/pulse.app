import { useEffect, type ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, layout, motion, radius, shadow, spacing, typography } from '../../theme/theme'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

const OFFSCREEN_Y = 600
const DRAG_DISMISS_THRESHOLD = 80

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  const translateY = useSharedValue(OFFSCREEN_Y)
  const backdropOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, motion.spring)
      backdropOpacity.value = withTiming(1, { duration: motion.base })
    }
  }, [visible, translateY, backdropOpacity])

  const dismiss = () => {
    translateY.value = withTiming(OFFSCREEN_Y, { duration: motion.slow })
    backdropOpacity.value = withTiming(0, { duration: motion.slow }, (finished) => {
      if (finished) runOnJS(onClose)()
    })
  }

  const drag = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) translateY.value = event.translationY
    })
    .onEnd((event) => {
      if (event.translationY > DRAG_DISMISS_THRESHOLD) {
        translateY.value = withTiming(OFFSCREEN_Y, { duration: motion.slow })
        backdropOpacity.value = withTiming(0, { duration: motion.slow }, (finished) => {
          if (finished) runOnJS(onClose)()
        })
      } else {
        translateY.value = withSpring(0, motion.spring)
      }
    })

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={dismiss} hitSlop={layout.hitSlop} />
        </Animated.View>
        <GestureDetector gesture={drag}>
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }, sheetStyle]}>
            <View style={styles.grabber} />
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {children}
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.overlayScrim,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    ...shadow.lg,
  },
  grabber: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
})
