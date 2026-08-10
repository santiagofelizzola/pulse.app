import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { UserRound } from 'lucide-react-native'
import { SvgXml } from 'react-native-svg'

import { canvas, colors, fonts, radius, shadow, spacing, typography } from '../../../theme/theme'
import type { PlaceableToolType } from '../../../store/canvasStore'
import { CONE_DEFAULT_COLOR, useEquipmentSvgText, type EquipmentAssetKey } from '../../../utils/canvasUtils'

interface ToolPaletteProps {
  activeTool: PlaceableToolType | null
  onSelectTool: (tool: PlaceableToolType) => void
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
    default:
      return null
  }
}

export function ToolPalette({ activeTool, onSelectTool }: ToolPaletteProps) {
  const [playerFlyoutOpen, setPlayerFlyoutOpen] = useState(false)
  const isPlayerToolActive = PLAYER_PRESETS.some((preset) => preset.tool === activeTool)

  return (
    <View style={styles.wrapper}>
      {playerFlyoutOpen ? (
        <View style={styles.flyout}>
          {PLAYER_PRESETS.map((preset) => (
            <Pressable
              key={preset.tool}
              accessibilityLabel={preset.label || 'Blank player marker'}
              onPress={() => {
                onSelectTool(preset.tool)
                setPlayerFlyoutOpen(false)
              }}
              style={styles.flyoutButton}
            >
              <View style={[styles.markerPreview, activeTool === preset.tool && styles.markerPreviewActive]}>
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
          const selected = activeTool === tool
          return (
            <Pressable
              key={tool}
              accessibilityLabel={label}
              onPress={() => {
                setPlayerFlyoutOpen(false)
                onSelectTool(tool)
              }}
              style={[styles.toolButton, selected && styles.toolButtonSelected]}
            >
              <ToolIcon tool={tool} selected={selected} />
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
