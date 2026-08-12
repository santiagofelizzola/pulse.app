import { useCallback, useState, type ReactNode } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { BringToFront, Copy, Palette, Trash2 } from 'lucide-react-native'

import { canvas, colors, layout, motion, radius, shadow, spacing } from '../../../theme/theme'
import {
  getArrowScreenBounds,
  getObjectFootprint,
  HANDLE_HIT_RADIUS,
  ROTATE_HANDLE_GAP,
  rotatedBoundingBox,
  rotatePointAround,
  type ScreenBox,
} from '../../../utils/canvasUtils'
import type { SelectedItem } from '../../../store/canvasStore'

interface SelectionOverlayProps {
  selected: SelectedItem
  canvasSize: { width: number; height: number }
  hidden: boolean
  onDuplicate: () => void
  // Present only for objects whose type carries a `color` field (cone, disc) — the toolbar's
  // deferred "color" action from the Session 3 selection spec (design.md §7).
  onColor?: () => void
  onBringToFront: () => void
  onDelete: () => void
}

const TOOLBAR_ICON_SIZE = 22
const HANDLE_SIZE = 20
const TOOLBAR_ESTIMATED_WIDTH = 3 * layout.touchTarget

export function SelectionOverlay({ selected, canvasSize, hidden, onDuplicate, onColor, onBringToFront, onDelete }: SelectionOverlayProps) {
  const [toolbarWidth, setToolbarWidth] = useState(TOOLBAR_ESTIMATED_WIDTH)

  const handleToolbarLayout = useCallback((event: LayoutChangeEvent) => {
    setToolbarWidth(event.nativeEvent.layout.width)
  }, [])

  if (!selected || hidden || canvasSize.width === 0) return null

  let box: ScreenBox
  let rotation = 0
  let showHandles = false
  let handleCx = 0
  let handleCy = 0
  let handleHalfW = 0
  let handleHalfH = 0

  if (selected.kind === 'object') {
    const object = selected.object
    const cx = object.x * canvasSize.width
    const cy = object.y * canvasSize.height
    const footprint = getObjectFootprint(object, canvasSize)
    const width = footprint.width * object.scale
    const height = footprint.height * object.scale
    box = rotatedBoundingBox(cx, cy, width, height, object.rotation)
    rotation = object.rotation
    showHandles = true
    handleCx = cx
    handleCy = cy
    handleHalfW = width / 2
    handleHalfH = height / 2
  } else {
    box = getArrowScreenBounds(selected.arrow.points, canvasSize)
  }

  const boxCenterX = (box.left + box.right) / 2
  const flips = box.top < canvasSize.height * canvas.selectionTopFlipThreshold
  const toolbarY = flips ? box.bottom + spacing.sm : box.top - spacing.sm - layout.touchTarget
  const toolbarLeft = Math.min(Math.max(boxCenterX - toolbarWidth / 2, spacing.sm), canvasSize.width - toolbarWidth - spacing.sm)

  const rotateHandle = showHandles
    ? rotatePointAround({ x: 0, y: -handleHalfH - ROTATE_HANDLE_GAP }, rotation, handleCx, handleCy)
    : null
  const scaleHandle = showHandles ? rotatePointAround({ x: handleHalfW, y: handleHalfH }, rotation, handleCx, handleCy) : null

  return (
    <>
      {selected.kind === 'object' ? (
        <View
          pointerEvents="none"
          style={[
            styles.outline,
            {
              left: box.left,
              top: box.top,
              width: box.right - box.left,
              height: box.bottom - box.top,
            },
          ]}
        />
      ) : null}

      {rotateHandle ? <Handle x={rotateHandle.x} y={rotateHandle.y} /> : null}
      {scaleHandle ? <Handle x={scaleHandle.x} y={scaleHandle.y} /> : null}

      <ToolbarAnimatedContainer left={toolbarLeft} top={toolbarY}>
        {/* box-none: only the Pressable buttons below should catch touches — without this, the
            pill's own background (padding, gaps between icons) would swallow taps that land on
            it, silently eating the "tap away to deselect" gesture instead of passing it through
            to the canvas underneath. */}
        <View style={styles.toolbar} onLayout={handleToolbarLayout} pointerEvents="box-none">
          <Pressable accessibilityLabel="Duplicate" onPress={onDuplicate} hitSlop={layout.hitSlop} style={styles.toolbarButton}>
            <Copy size={TOOLBAR_ICON_SIZE} color={colors.textInverse} />
          </Pressable>
          {onColor ? (
            <Pressable accessibilityLabel="Color" onPress={onColor} hitSlop={layout.hitSlop} style={styles.toolbarButton}>
              <Palette size={TOOLBAR_ICON_SIZE} color={colors.textInverse} />
            </Pressable>
          ) : null}
          <Pressable accessibilityLabel="Bring to front" onPress={onBringToFront} hitSlop={layout.hitSlop} style={styles.toolbarButton}>
            <BringToFront size={TOOLBAR_ICON_SIZE} color={colors.textInverse} />
          </Pressable>
          <Pressable accessibilityLabel="Delete" onPress={onDelete} hitSlop={layout.hitSlop} style={styles.toolbarButton}>
            <Trash2 size={TOOLBAR_ICON_SIZE} color={colors.error} />
          </Pressable>
        </View>
      </ToolbarAnimatedContainer>
    </>
  )
}

function Handle({ x, y }: { x: number; y: number }) {
  return (
    <View pointerEvents="none" style={[styles.handle, { left: x - HANDLE_SIZE / 2, top: y - HANDLE_SIZE / 2 }]} />
  )
}

// Animates the Y reposition when the toolbar flips above/below (design.md §10:
// "animate the Y translation with motion.spring so it glides ... rather than jumping").
function ToolbarAnimatedContainer({ left, top, children }: { left: number; top: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({
    left,
    top: withSpring(top, motion.spring),
  }))

  return (
    <Animated.View pointerEvents="box-none" style={[styles.toolbarContainer, style]}>
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  outline: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadow.sm,
  },
  toolbarContainer: {
    position: 'absolute',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.overlayBar,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    ...shadow.md,
  },
  toolbarButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
