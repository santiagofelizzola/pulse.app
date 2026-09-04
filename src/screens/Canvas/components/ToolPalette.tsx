import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Check, Palette, Square, UserRound } from 'lucide-react-native'
import { Path as SvgPath, Svg, SvgXml } from 'react-native-svg'

import { usePressAnimation } from '../../../components/ui/usePressAnimation'
import { canvas, colors, fonts, layout, radius, shadow, spacing, typography } from '../../../theme/theme'
import type { CanvasTool, PlaceableToolType } from '../../../store/canvasStore'
import {
  CANVAS_COLOR_SWATCHES,
  CONE_DEFAULT_COLOR,
  getMarkerTextColor,
  PLAYER_DEFAULT_COLOR,
  useEquipmentSvgText,
  type EquipmentAssetKey,
} from '../../../utils/canvasUtils'
import type { ArrowType } from '../../../types'

interface ToolPaletteProps {
  activeTool: CanvasTool
  onSelectTool: (tool: CanvasTool) => void
}

const PLAYER_PRESETS: Array<{ tool: PlaceableToolType; label: string }> = [
  { tool: 'player-blank', label: '' },
  { tool: 'player-gk', label: 'GK' },
  { tool: 'player-co', label: 'Co' },
]

const BALL_OPTIONS: Array<{ tool: PlaceableToolType; assetKey: EquipmentAssetKey; label: string; accessibilityLabel: string }> = [
  { tool: 'ball-bw', assetKey: 'ball-bw', label: 'BW', accessibilityLabel: 'Ball (black & white)' },
  { tool: 'ball-color', assetKey: 'ball-color', label: 'Color', accessibilityLabel: 'Ball (color)' },
]

const ARROW_TOOLS: Array<{ type: ArrowType; label: string }> = [
  { type: 'pass', label: 'Pass' },
  { type: 'shot', label: 'Shot' },
  { type: 'run', label: 'Run' },
  { type: 'dribble', label: 'Dribble' },
]

const ICON_SIZE = 24

// The color flyout is the one popover that can't be a single row — ten 44px swatches would be
// ~440px wide and run off a portrait screen. Five columns wraps it into two rows, at the exact
// width derived below from that count and the tray's own tokens rather than eyeballed.
//
// This has to be a DEFINITE width, not a maxWidth. The flyout is absolutely positioned inside
// styles.slot, which is only as wide as its own 44px button, so a wrapping container there has
// ~44px of available width to wrap against — every swatch lands on its own row and the whole pill
// overflows off the screen edge. The non-wrapping flyoutRow below never hit this: it just
// overflows its parent horizontally, which is exactly what it wants.
const SWATCH_COLUMNS = 5
const SWATCH_GRID_WIDTH =
  SWATCH_COLUMNS * layout.touchTarget + (SWATCH_COLUMNS - 1) * spacing.xs + spacing.sm * 2

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// Goal/mini-goal/ball source files are pre-colored to fixed hex (baked-in colors.canvasInk for
// the goals, native ball colors for the balls) — no currentColor placeholders. When selected,
// swap the baked-in canvasInk for colors.primary so the icon echoes the tint behind it, same as
// every other tool. Ball icons keep their own native colors even when selected (recoloring them
// would defeat the point of comparing the two variants); the primaryTint backdrop alone signals
// their selected state.
function SvgToolIcon({ assetKey, tint }: { assetKey: EquipmentAssetKey; tint?: string }) {
  const xml = useEquipmentSvgText(assetKey)
  const displayXml = useMemo(() => {
    if (!xml) return null
    return tint ? xml.split(colors.canvasInk).join(tint) : xml
  }, [xml, tint])

  if (!displayXml) return <View style={{ width: ICON_SIZE, height: ICON_SIZE }} />
  return <SvgXml xml={displayXml} width={ICON_SIZE} height={ICON_SIZE} />
}

// The cone's body uses fill="currentColor" (it's per-object recolorable — see CanvasObject.tsx),
// which react-native-svg resolves natively via the `color` prop, so no text substitution is
// needed here the way SvgToolIcon needs it for the baked-hex assets. Always shown in the same
// orange the cone actually places with (matching CONE_DEFAULT_COLOR) — like the ball icons, it
// keeps its own color even when selected; the primaryTint backdrop alone signals selection.
function ConeToolIcon() {
  const xml = useEquipmentSvgText('cone')
  if (!xml) return <View style={{ width: ICON_SIZE, height: ICON_SIZE }} />
  return <SvgXml xml={xml} width={ICON_SIZE} height={ICON_SIZE} color={CONE_DEFAULT_COLOR} />
}

// No stock icon set covers "squiggly dribble line" vs. "double solid shot line", so each arrow
// tool gets a small hand-drawn line-preview swatch (same idea as the player-preset marker
// preview below) instead of a lucide icon.
function ArrowToolIcon({ type, selected }: { type: ArrowType; selected: boolean }) {
  const color = selected ? colors.primary : colors.textPrimary

  switch (type) {
    case 'pass':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <SvgPath d="M3 12 H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )
    case 'shot':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <SvgPath d="M3 9.5 H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <SvgPath d="M3 14.5 H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )
    case 'run':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <SvgPath d="M3 12 H21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray="4 3.5" />
        </Svg>
      )
    case 'dribble':
      return (
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
          <SvgPath
            d="M2 12 Q6 6 10 12 T18 12 T24 12"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      )
  }
}

function isPlaceToolActive(activeTool: CanvasTool, tool: PlaceableToolType): boolean {
  return activeTool.kind === 'place' && activeTool.type === tool
}

function isDrawToolActive(activeTool: CanvasTool, type: ArrowType): boolean {
  return activeTool.kind === 'draw' && activeTool.type === type
}

// The armed color, or null when color mode isn't active. Drives both the parent button's tint and
// which swatch shows its check — one derivation, so the two can't disagree.
function getArmedColor(activeTool: CanvasTool): string | null {
  return activeTool.kind === 'color' ? activeTool.color : null
}

// A top-level palette entry: 44px icon button with a caption label underneath (icon-over-label,
// design.md §6's Tab Bar item layout), optionally with a popover of nested options anchored
// above it (Player/Ball/Color) — same floating-popover treatment for all three, not just Player.
//
// The popover is wider than its own 44px button, so it can't be centered on the button without
// risking an overflow off whichever screen edge the button sits closer to (Player is the
// leftmost item in its row, Ball and Color the rightmost in theirs). `flyoutAlign` anchors the
// popover's own left or right edge to the button's matching edge instead, so it always grows
// *inward* toward the middle of the tray rather than centering and potentially spilling
// off-screen.
function ToolSlot({
  label,
  accessibilityLabel,
  selected,
  onPress,
  icon,
  flyout,
  flyoutAlign = 'start',
}: {
  label: string
  accessibilityLabel?: string
  selected: boolean
  onPress: () => void
  icon: ReactNode
  flyout?: ReactNode
  flyoutAlign?: 'start' | 'end'
}) {
  // Only the button scales. The flyout anchor is positioned on styles.slot — a sibling of the
  // button, not a child — so a pressed button never drags its popover with it.
  const press = usePressAnimation()

  return (
    <View style={styles.slot}>
      {flyout ? (
        <View style={[styles.flyoutAnchor, flyoutAlign === 'end' ? styles.flyoutAnchorEnd : styles.flyoutAnchorStart]}>
          {flyout}
        </View>
      ) : null}
      <AnimatedPressable
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[styles.toolButton, selected && styles.toolButtonSelected, press.animatedStyle]}
      >
        {icon}
      </AnimatedPressable>
      <Text style={[styles.slotLabel, selected && styles.slotLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

// Its own component only so each nested option can hold a press animation of its own — a hook
// can't be called inside the flyout maps below. Renders exactly the Pressable it replaced.
function FlyoutButton({
  accessibilityLabel,
  onPress,
  children,
}: {
  accessibilityLabel: string
  onPress: () => void
  children: ReactNode
}) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.flyoutButton, press.animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  )
}

// A single color swatch in the color tool's flyout. Its own component for the same reason
// FlyoutButton is — each one holds a press animation, and a hook can't be called inside a map.
// The armed swatch carries a check rather than a ring, since the swatch IS the color and a ring
// around a dark fill reads poorly; the check's ink flips for contrast the same way a marker
// label's does (getMarkerTextColor), so it stays legible on black and on white alike.
function SwatchButton({ color, isArmed, onPress }: { color: string; isArmed: boolean; onPress: () => void }) {
  const press = usePressAnimation()

  return (
    <AnimatedPressable
      accessibilityLabel={color}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.swatchButton, press.animatedStyle]}
    >
      <View style={[styles.swatch, { backgroundColor: color }]}>
        {isArmed ? <Check size={18} color={getMarkerTextColor(color)} /> : null}
      </View>
    </AnimatedPressable>
  )
}

type FlyoutKey = 'player' | 'ball' | 'color' | null

export function ToolPalette({ activeTool, onSelectTool }: ToolPaletteProps) {
  const [openFlyout, setOpenFlyout] = useState<FlyoutKey>(null)

  const isPlayerActive = PLAYER_PRESETS.some((preset) => isPlaceToolActive(activeTool, preset.tool))
  const isBallActive = BALL_OPTIONS.some((option) => isPlaceToolActive(activeTool, option.tool))
  const isZoneActive = isPlaceToolActive(activeTool, 'shape-rect')
  const armedColor = getArmedColor(activeTool)

  const toggleFlyout = (key: Exclude<FlyoutKey, null>) => setOpenFlyout((open) => (open === key ? null : key))

  const selectAndClose = (tool: CanvasTool) => {
    onSelectTool(tool)
    setOpenFlyout(null)
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <ToolSlot
          label="Player"
          selected={isPlayerActive}
          onPress={() => toggleFlyout('player')}
          icon={<UserRound size={ICON_SIZE} color={isPlayerActive ? colors.primary : colors.textPrimary} />}
          flyout={
            openFlyout === 'player' ? (
              <View style={styles.flyoutRow}>
                {PLAYER_PRESETS.map((preset) => (
                  <FlyoutButton
                    key={preset.tool}
                    accessibilityLabel={preset.label || 'Blank player marker'}
                    onPress={() => selectAndClose({ kind: 'place', type: preset.tool })}
                  >
                    <View style={[styles.markerPreview, isPlaceToolActive(activeTool, preset.tool) && styles.markerPreviewActive]}>
                      <Text style={styles.markerPreviewLabel}>{preset.label}</Text>
                    </View>
                  </FlyoutButton>
                ))}
              </View>
            ) : null
          }
        />

        <ToolSlot
          label="Cone"
          selected={isPlaceToolActive(activeTool, 'cone')}
          onPress={() => selectAndClose({ kind: 'place', type: 'cone' })}
          icon={<ConeToolIcon />}
        />

        <ToolSlot
          label="Goal"
          selected={isPlaceToolActive(activeTool, 'goal')}
          onPress={() => selectAndClose({ kind: 'place', type: 'goal' })}
          icon={<SvgToolIcon assetKey="goal" tint={isPlaceToolActive(activeTool, 'goal') ? colors.primary : undefined} />}
        />

        <ToolSlot
          label="Mini-goal"
          selected={isPlaceToolActive(activeTool, 'mini-goal')}
          onPress={() => selectAndClose({ kind: 'place', type: 'mini-goal' })}
          icon={<SvgToolIcon assetKey="mini-goal" tint={isPlaceToolActive(activeTool, 'mini-goal') ? colors.primary : undefined} />}
        />

        <ToolSlot
          label="Ball"
          selected={isBallActive}
          onPress={() => toggleFlyout('ball')}
          flyoutAlign="end"
          // The parent button always shows the color-ball asset as "Ball"'s representative icon
          // (like Player's fixed UserRound regardless of which preset is active below it) — the
          // primaryTint backdrop, not an icon swap, is what signals a variant is active.
          icon={<SvgToolIcon assetKey="ball-color" />}
          flyout={
            openFlyout === 'ball' ? (
              <View style={styles.flyoutRow}>
                {BALL_OPTIONS.map((option) => (
                  <FlyoutButton
                    key={option.tool}
                    accessibilityLabel={option.accessibilityLabel}
                    onPress={() => selectAndClose({ kind: 'place', type: option.tool })}
                  >
                    <SvgToolIcon assetKey={option.assetKey} />
                    <Text style={styles.flyoutLabel}>{option.label}</Text>
                  </FlyoutButton>
                ))}
              </View>
            ) : null
          }
        />
      </View>

      <View style={styles.row}>
        {/* Places directly, with no flyout: the circle zone left the palette, and a popover
            offering one option is a tap the coach shouldn't have to make. CircleZone itself is
            untouched — the type, its interface and CanvasObject's renderer all stay, so a saved
            drill containing one still renders and still selects. */}
        <ToolSlot
          label="Zone"
          selected={isZoneActive}
          onPress={() => selectAndClose({ kind: 'place', type: 'shape-rect' })}
          icon={<Square size={ICON_SIZE} color={isZoneActive ? colors.primary : colors.textPrimary} strokeWidth={1.75} />}
        />

        {ARROW_TOOLS.map(({ type, label }) => {
          const selected = isDrawToolActive(activeTool, type)
          return (
            <ToolSlot
              key={type}
              label={label}
              selected={selected}
              onPress={() => selectAndClose({ kind: 'draw', type })}
              icon={<ArrowToolIcon type={type} selected={selected} />}
            />
          )
        })}

        {/* Color is a MODE, not a placement tool: arming it repaints whatever colorable object the
            coach taps next, for as long as it stays armed. It sits at the tail of this row rather
            than in a third row (a new row would cost the pitch ~60px of height) and rather than in
            row 1 (appending here moves no existing tool and re-aligns no other flyout). Like Ball,
            it's the rightmost slot, so its popover anchors its right edge and grows inward. */}
        <ToolSlot
          label="Color"
          accessibilityLabel="Color tool"
          selected={armedColor !== null}
          onPress={() => toggleFlyout('color')}
          flyoutAlign="end"
          // Armed, the button becomes the color itself — a filled chip, not a tinted Palette icon.
          // Tinting the icon's strokes would make the white swatch vanish against the primaryTint
          // backdrop; the chip carries a hairline border, so every swatch stays visible. Idle, it's
          // the plain Palette icon, since there's no color to show yet.
          icon={
            armedColor ? (
              <View style={[styles.swatch, { backgroundColor: armedColor }]} />
            ) : (
              <Palette size={ICON_SIZE} color={colors.textPrimary} />
            )
          }
          flyout={
            openFlyout === 'color' ? (
              <View style={styles.flyoutGrid}>
                {CANVAS_COLOR_SWATCHES.map((color) => (
                  <SwatchButton
                    key={color}
                    color={color}
                    isArmed={armedColor === color}
                    // selectAndClose routes through selectTool, so tapping the ARMED swatch again
                    // disarms back to select — the tool's only exit, matching every other tool.
                    onPress={() => selectAndClose({ kind: 'color', color })}
                  />
                ))}
              </View>
            ) : null
          }
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slot: {
    position: 'relative',
    alignItems: 'center',
  },
  // Buttons are sized to the 44px touch-target minimum already, so no hitSlop is added —
  // hitSlop expansion on adjacently-packed 44px buttons with an 8px gap would make neighbors'
  // touch areas overlap, causing taps near a button's edge to register on the wrong neighbor.
  toolButton: {
    width: canvas.toolButton,
    height: canvas.toolButton,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonSelected: {
    backgroundColor: colors.primaryTint,
  },
  slotLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  slotLabelSelected: {
    color: colors.primary,
  },
  // Anchors a nested-option popover above its own button. Only one of left/right is set (by
  // flyoutAnchorStart/End below) so the popover's width stays content-sized and grows away from
  // whichever screen edge its button is closest to, instead of centering and risking overflow.
  flyoutAnchor: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: spacing.sm,
  },
  flyoutAnchorStart: {
    left: 0,
  },
  flyoutAnchorEnd: {
    right: 0,
  },
  flyoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    ...shadow.md,
  },
  // Wrapping variant of flyoutRow for the color tool's ten swatches. Capped width forces the
  // five-per-row wrap; vertical padding is explicit here because, unlike flyoutRow, the rows
  // stack and can't rely on a single 44px button height for their breathing room.
  flyoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: SWATCH_GRID_WIDTH,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    ...shadow.md,
  },
  flyoutButton: {
    minWidth: layout.touchTarget,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  // 44px touch target with the 30px swatch centered inside, the same visual-inside-target rule
  // markerPreview below uses.
  swatchButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: canvas.marker.diameter,
    height: canvas.marker.diameter,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyoutLabel: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  // 44px touch target with the 30px marker preview centered inside — matches design.md's
  // "transparent hit area padding around the 30px visual" rule without needing hitSlop.
  // Fill and label track PLAYER_DEFAULT_COLOR so the preview shows what the tool actually places;
  // on the black default the border is invisible against the fill, which is why the active state
  // still needs its own primary ring to read.
  markerPreview: {
    width: canvas.marker.diameter,
    height: canvas.marker.diameter,
    borderRadius: radius.pill,
    backgroundColor: PLAYER_DEFAULT_COLOR,
    borderWidth: canvas.marker.border,
    borderColor: colors.canvasInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPreviewActive: {
    borderColor: colors.primary,
  },
  markerPreviewLabel: {
    ...typography.label,
    fontFamily: fonts.semibold,
    color: getMarkerTextColor(PLAYER_DEFAULT_COLOR),
  },
})
