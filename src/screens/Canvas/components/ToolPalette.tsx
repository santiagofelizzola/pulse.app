import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import {
  Circle as CircleIcon,
  CircleDot,
  Cone,
  Disc,
  Flag,
  Goal,
  Milestone,
  RectangleHorizontal,
  Rows3,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native'

import { canvas, colors, layout, radius, shadow, spacing, typography, fonts } from '../../../theme/theme'
import type { PlaceableToolType } from '../../../store/canvasStore'

interface ToolPaletteProps {
  activeTool: PlaceableToolType | null
  onSelectTool: (tool: PlaceableToolType) => void
  bottomInset: number
}

const EQUIPMENT_TOOLS: Array<{ tool: PlaceableToolType; Icon: LucideIcon; label: string }> = [
  { tool: 'cone', Icon: Cone, label: 'Cone' },
  { tool: 'disc', Icon: Disc, label: 'Disc' },
  { tool: 'pole', Icon: Milestone, label: 'Pole' },
  { tool: 'ladder', Icon: Rows3, label: 'Ladder' },
  { tool: 'flag', Icon: Flag, label: 'Flag' },
  { tool: 'goal', Icon: Goal, label: 'Goal' },
  { tool: 'mini-goal', Icon: RectangleHorizontal, label: 'Mini goal' },
  // Temporary: both ball variants get their own button so they can be compared on-canvas.
  // Collapse to one permanent ball tool once a variant is picked.
  { tool: 'ball-bw', Icon: CircleDot, label: 'Ball (black & white)' },
  { tool: 'ball-color', Icon: CircleIcon, label: 'Ball (color)' },
]

const PLAYER_PRESETS: Array<{ tool: PlaceableToolType; label: string }> = [
  { tool: 'player-blank', label: '' },
  { tool: 'player-gk', label: 'GK' },
  { tool: 'player-co', label: 'Co' },
]

export function ToolPalette({ activeTool, onSelectTool, bottomInset }: ToolPaletteProps) {
  const [playerFlyoutOpen, setPlayerFlyoutOpen] = useState(false)
  const isPlayerToolActive = PLAYER_PRESETS.some((preset) => preset.tool === activeTool)
  const { width: windowWidth } = useWindowDimensions()
  const paletteMaxWidth = windowWidth - spacing.xxl * 2

  return (
    <View style={[styles.wrapper, { bottom: bottomInset + spacing.lg }]} pointerEvents="box-none">
      {playerFlyoutOpen ? (
        <View style={styles.flyout}>
          {PLAYER_PRESETS.map((preset) => (
            <Pressable
              key={preset.tool}
              hitSlop={layout.hitSlop}
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

      <View style={[styles.palette, { maxWidth: paletteMaxWidth }]}>
        <Pressable
          hitSlop={layout.hitSlop}
          accessibilityLabel="Player"
          onPress={() => setPlayerFlyoutOpen((open) => !open)}
          style={[styles.toolButton, isPlayerToolActive && styles.toolButtonSelected]}
        >
          <UserRound size={24} color={isPlayerToolActive ? colors.onPrimary : colors.textInverse} />
        </Pressable>

        <View style={styles.divider} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.equipmentRow}
          style={styles.equipmentScroll}
        >
          {EQUIPMENT_TOOLS.map(({ tool, Icon, label }) => {
            const selected = activeTool === tool
            return (
              <Pressable
                key={tool}
                hitSlop={layout.hitSlop}
                accessibilityLabel={label}
                onPress={() => {
                  setPlayerFlyoutOpen(false)
                  onSelectTool(tool)
                }}
                style={[styles.toolButton, selected && styles.toolButtonSelected]}
              >
                <Icon size={24} color={selected ? colors.onPrimary : colors.textInverse} />
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  palette: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayBar,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    ...shadow.lg,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  equipmentScroll: {
    flexShrink: 1,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toolButton: {
    width: canvas.toolButton,
    height: canvas.toolButton,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonSelected: {
    width: canvas.toolButton - 4,
    height: canvas.toolButton - 4,
    backgroundColor: colors.primary,
  },
  flyout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayBar,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.md,
  },
  flyoutButton: {
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
