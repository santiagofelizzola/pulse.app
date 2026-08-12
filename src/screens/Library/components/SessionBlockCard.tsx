import { ChevronDown, ChevronRight, GripVertical, Image as ImageIcon, Trash2 } from 'lucide-react-native'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import { colors, layout, motion, radius, shadow, spacing, typography } from '../../../theme/theme'
import { blockTypeColor, blockTypeLabel } from '../../../utils/blockTypes'
import type { SessionActivity } from '../../../types'

// Collapsed card height is fixed (not measured) so the drag-reorder math below has an exact,
// known row step. All cards are forced collapsed for the duration of any drag (see
// SessionBuilderScreen) so this height is never violated while dragging is in progress.
export const SESSION_CARD_HEIGHT = 108
export const SESSION_CARD_GAP = spacing.md
const ROW_STEP = SESSION_CARD_HEIGHT + SESSION_CARD_GAP

interface SessionBlockCardProps {
  block: SessionActivity
  index: number
  blocksCount: number
  activeIndex: SharedValue<number>
  dragY: SharedValue<number>
  isExpanded: boolean
  onToggleExpand: () => void
  onDragStart: () => void
  onDragEnd: (id: string, deltaIndex: number) => void
  onOpenBlockTypePicker: () => void
  onOpenCoachingPointsEditor: () => void
  onOpenDurationEditor: () => void
  onRemove: () => void
}

export function SessionBlockCard({
  block,
  index,
  blocksCount,
  activeIndex,
  dragY,
  isExpanded,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onOpenBlockTypePicker,
  onOpenCoachingPointsEditor,
  onOpenDurationEditor,
  onRemove,
}: SessionBlockCardProps) {
  const color = blockTypeColor(block.blockType)
  const coachingLines = block.coachingPoints
    ? block.coachingPoints.split('\n').map((line) => line.trim()).filter(Boolean)
    : []

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(350)
    .onStart(() => {
      activeIndex.value = index
      dragY.value = 0
      runOnJS(onDragStart)()
    })
    .onUpdate((event) => {
      dragY.value = event.translationY
    })
    .onEnd(() => {
      const rawTarget = index + Math.round(dragY.value / ROW_STEP)
      const clamped = Math.max(0, Math.min(blocksCount - 1, rawTarget))
      dragY.value = withTiming(0)
      activeIndex.value = -1
      runOnJS(onDragEnd)(block.id, clamped - index)
    })

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index

    if (isActive) {
      return {
        transform: [{ translateY: dragY.value }, { scale: 1.02 }],
        zIndex: 10,
        shadowOpacity: shadow.md.shadowOpacity,
        shadowRadius: shadow.md.shadowRadius,
        shadowOffset: shadow.md.shadowOffset,
        elevation: shadow.md.elevation,
      }
    }

    let shift = 0
    if (activeIndex.value !== -1) {
      const targetIndex = Math.max(
        0,
        Math.min(blocksCount - 1, activeIndex.value + Math.round(dragY.value / ROW_STEP))
      )
      if (index > activeIndex.value && index <= targetIndex) shift = -ROW_STEP
      else if (index < activeIndex.value && index >= targetIndex) shift = ROW_STEP
    }

    return {
      transform: [{ translateY: withTiming(shift, { duration: motion.base }) }, { scale: 1 }],
      zIndex: 1,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    }
  })

  return (
    <Animated.View style={[styles.card, isExpanded ? styles.cardExpanded : styles.cardCollapsed, animatedStyle]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          {block.activity.thumbnailUri ? (
            <Image source={{ uri: block.activity.thumbnailUri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <ImageIcon size={18} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {block.activity.name}
            </Text>
            <View style={styles.metaRow}>
              <Pressable onPress={onOpenBlockTypePicker} hitSlop={layout.hitSlop}>
                <Text style={[styles.overline, { color }]}>{blockTypeLabel(block.blockType)}</Text>
              </Pressable>
              <Text style={styles.metaDot}>·</Text>
              <Pressable onPress={onOpenDurationEditor} hitSlop={layout.hitSlop}>
                <Text style={styles.durationLabel}>
                  {block.durationOverride ? `${block.durationOverride} min` : 'Set duration'}
                </Text>
              </Pressable>
            </View>
          </View>
          {blocksCount > 1 ? (
            <GestureDetector gesture={dragGesture}>
              <View style={styles.dragHandle} hitSlop={layout.hitSlop}>
                <GripVertical size={20} color={colors.textTertiary} />
              </View>
            </GestureDetector>
          ) : null}
          <Pressable onPress={onRemove} hitSlop={layout.hitSlop} style={styles.deleteButton}>
            <Trash2 size={18} color={colors.error} />
          </Pressable>
        </View>

        <Pressable onPress={onToggleExpand} style={styles.pointsRow}>
          {isExpanded ? (
            <ChevronDown size={16} color={colors.textSecondary} />
          ) : (
            <ChevronRight size={16} color={colors.textSecondary} />
          )}
          <Text style={styles.pointsLabel}>
            {coachingLines.length > 0
              ? `${coachingLines.length} coaching point${coachingLines.length === 1 ? '' : 's'}`
              : 'Add coaching points'}
          </Text>
        </Pressable>

        {isExpanded ? (
          <View style={styles.expanded}>
            {coachingLines.length > 0 ? (
              <View style={styles.bulletList}>
                {coachingLines.map((line, lineIndex) => (
                  <Text key={lineIndex} style={styles.bullet}>
                    {'•  '}
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
            <Pressable onPress={onOpenCoachingPointsEditor} style={styles.editButton}>
              <Text style={styles.editButtonLabel}>{coachingLines.length > 0 ? 'Edit coaching points' : 'Add coaching points'}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    shadowColor: shadow.md.shadowColor,
  },
  cardCollapsed: {
    height: SESSION_CARD_HEIGHT,
  },
  cardExpanded: {
    // Height grows to fit the expanded bullet list; drag is disabled while any card is
    // expanded (see SessionBuilderScreen), so the fixed-height reorder math is unaffected.
  },
  bar: {
    width: 4,
    // Not clipped via the card's overflow (that would also clip the drag-lift shadow) —
    // radius is matched explicitly instead, per design.md's left-bar spec.
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  overline: {
    ...typography.overline,
  },
  metaDot: {
    ...typography.overline,
    color: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },
  durationLabel: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  dragHandle: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
  },
  pointsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  expanded: {
    marginTop: spacing.sm,
  },
  bulletList: {
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  bullet: {
    ...typography.callout,
    color: colors.textPrimary,
  },
  editButton: {
    alignSelf: 'flex-start',
  },
  editButtonLabel: {
    ...typography.label,
    color: colors.primary,
  },
})
