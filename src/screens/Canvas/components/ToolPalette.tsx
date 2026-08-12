import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Circle as CircleIcon, Square, UserRound } from 'lucide-react-native'
import { Path as SvgPath, Svg, SvgXml } from 'react-native-svg'

import { canvas, colors, fonts, radius, shadow, spacing, typography } from '../../../theme/theme'
import type { CanvasTool, PlaceableToolType } from '../../../store/canvasStore'
import { CONE_DEFAULT_COLOR, useEquipmentSvgText, type EquipmentAssetKey } from '../../../utils/canvasUtils'
import type { ArrowType } from '../../../types'

interface ToolPaletteProps {
  activeTool: CanvasTool
  onSelectTool: (tool: CanvasTool) => void
}

const EQUIPMENT_TOOLS: Array<{ tool: PlaceableToolType; label: string }> = [
  { tool: 'cone', label: 'Cone' },
  { tool: 'goal', label: 'Goal' },
  { tool: 'mini-goal', label: 'Mini goal' },
  // Temporary: both ball variants get their own button so they can be compared on-canvas.
  // Collapse to one permanent ball tool once a variant is picked.
  { tool: 'ball-bw', label: 'Ball (black & white)' },
  { tool: 'ball-color', label: 'Ball (color)' },
]

const PLAYER_PRESETS: Array<{ tool: PlaceableToolType; label: string }> = [
  { tool: 'player-blank', label: '' },
  { tool: 'player-gk', label: 'GK' },
  { tool: 'player-co', label: 'Co' },
]

const SHAPE_TOOLS: Array<{ tool: PlaceableToolType; label: string }> = [
  { tool: 'shape-rect', label: 'Rectangle' },
  { tool: 'shape-circle', label: 'Circle' },
]

const ARROW_TOOLS: Array<{ type: ArrowType; label: string }> = [
  { type: 'pass', label: 'Pass' },
  { type: 'shot', label: 'Shot' },
  { type: 'run', label: 'Run' },
  { type: 'dribble', label: 'Dribble' },
]

const ICON_SIZE = 24

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

function ToolIcon({ tool, selected }: { tool: PlaceableToolType; selected: boolean }) {
  switch (tool) {
    case 'cone':
      return <ConeToolIcon />
    case 'goal':
      return <SvgToolIcon assetKey="goal" tint={selected ? colors.primary : undefined} />
    case 'mini-goal':
      return <SvgToolIcon assetKey="mini-goal" tint={selected ? colors.primary : undefined} />
    case 'ball-bw':
      return <SvgToolIcon assetKey="ball-bw" />
    case 'ball-color':
      return <SvgToolIcon assetKey="ball-color" />
    case 'shape-rect':
      return <Square size={ICON_SIZE} color={selected ? colors.primary : colors.textPrimary} strokeWidth={1.75} />
    case 'shape-circle':
      return <CircleIcon size={ICON_SIZE} color={selected ? colors.primary : colors.textPrimary} strokeWidth={1.75} />
    default:
      return null
  }
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

export function ToolPalette({ activeTool, onSelectTool }: ToolPaletteProps) {
  const [playerFlyoutOpen, setPlayerFlyoutOpen] = useState(false)
  const isPlayerToolActive = PLAYER_PRESETS.some((preset) => isPlaceToolActive(activeTool, preset.tool))

  return (
    <View style={styles.wrapper}>
      {playerFlyoutOpen ? (
        <View style={styles.flyout}>
          {PLAYER_PRESETS.map((preset) => (
            <Pressable
              key={preset.tool}
              accessibilityLabel={preset.label || 'Blank player marker'}
              onPress={() => {
                onSelectTool({ kind: 'place', type: preset.tool })
                setPlayerFlyoutOpen(false)
              }}
              style={styles.flyoutButton}
            >
              <View style={[styles.markerPreview, isPlaceToolActive(activeTool, preset.tool) && styles.markerPreviewActive]}>
                <Text style={styles.markerPreviewLabel}>{preset.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.grid}>
        <Pressable
          accessibilityLabel="Player"
          onPress={() => setPlayerFlyoutOpen((open) => !open)}
          style={[styles.toolButton, isPlayerToolActive && styles.toolButtonSelected]}
        >
          <UserRound size={ICON_SIZE} color={isPlayerToolActive ? colors.primary : colors.textPrimary} />
        </Pressable>

        {EQUIPMENT_TOOLS.map(({ tool, label }) => {
          const selected = isPlaceToolActive(activeTool, tool)
          return (
            <Pressable
              key={tool}
              accessibilityLabel={label}
              onPress={() => {
                setPlayerFlyoutOpen(false)
                onSelectTool({ kind: 'place', type: tool })
              }}
              style={[styles.toolButton, selected && styles.toolButtonSelected]}
            >
              <ToolIcon tool={tool} selected={selected} />
            </Pressable>
          )
        })}

        {SHAPE_TOOLS.map(({ tool, label }) => {
          const selected = isPlaceToolActive(activeTool, tool)
          return (
            <Pressable
              key={tool}
              accessibilityLabel={label}
              onPress={() => {
                setPlayerFlyoutOpen(false)
                onSelectTool({ kind: 'place', type: tool })
              }}
              style={[styles.toolButton, selected && styles.toolButtonSelected]}
            >
              <ToolIcon tool={tool} selected={selected} />
            </Pressable>
          )
        })}

        {ARROW_TOOLS.map(({ type, label }) => {
          const selected = isDrawToolActive(activeTool, type)
          return (
            <Pressable
              key={type}
              accessibilityLabel={label}
              onPress={() => {
                setPlayerFlyoutOpen(false)
                onSelectTool({ kind: 'draw', type })
              }}
              style={[styles.toolButton, selected && styles.toolButtonSelected]}
            >
              <ArrowToolIcon type={type} selected={selected} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
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
  flyout: {
    position: 'absolute',
    left: 0,
    bottom: '100%',
    marginBottom: spacing.sm,
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
  // 44px touch target with the 30px marker preview centered inside — matches design.md's
  // "transparent hit area padding around the 30px visual" rule without needing hitSlop.
  flyoutButton: {
    width: canvas.toolButton,
    height: canvas.toolButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPreview: {
    width: canvas.marker.diameter,
    height: canvas.marker.diameter,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
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
    color: colors.canvasInk,
  },
})
