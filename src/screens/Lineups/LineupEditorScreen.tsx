import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { Alert, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { randomUUID } from 'expo-crypto'
import { LayoutGrid, Palette, Save, Share2, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ExportSheet } from '../../components/ui/ExportSheet'
import { useShareExport } from '../../export/useShareExport'
import { getPitchAspectRatio } from '../Canvas/components/PitchBackground'
import { lineupRepository } from '../../db/repositories/lineupRepository'
import type { RootStackParamList } from '../../navigation/types'
import { colors, layout, radius, spacing, typography } from '../../theme/theme'
import { carryOverPlayers, getFormationSlots } from '../../utils/formationSlots'
import { DEFAULT_LABEL_DISPLAY } from '../../utils/labelDisplay'
import { DEFAULT_MARKER_STYLE } from '../../utils/markerStyles'
import { DEFAULT_PITCH_STYLE } from '../../utils/pitchStyles'
import { assignShirtNumbers } from '../../utils/shirtNumbers'
import { exportLineup } from '../../utils/exportUtils'
import type {
  CreateLineupInput,
  Formation,
  LabelDisplay,
  LineupPosition,
  MarkerStyle,
  PitchStyle,
  SquadSize,
  SubEntry,
} from '../../types'
import { FormationPicker } from './components/FormationPicker'
import { LineupAppearanceSheet } from './components/LineupAppearanceSheet'
import { LineupPitch } from './components/LineupPitch'
import { LineupSaveSheet } from './components/LineupSaveSheet'
import { PositionEditSheet } from './components/PositionEditSheet'
import { SquadSizePicker } from './components/SquadSizePicker'
import { SubEditSheet } from './components/SubEditSheet'

type Route = RouteProp<RootStackParamList, 'LineupEditor'>

// Breathing room around the pitch within its flex:1 area — mirrors CanvasScreen's CANVAS_MARGIN
// so the lineup pitch reads at the same visual scale as the drawing canvas.
const CANVAS_MARGIN = spacing.lg

export default function LineupEditorScreen() {
  const navigation = useNavigation()
  const { params } = useRoute<Route>()
  const lineupId = params?.lineupId
  const insets = useSafeAreaInsets()

  const [phase, setPhase] = useState<'squad-size' | 'pitch'>(lineupId ? 'pitch' : 'squad-size')
  const [squadSize, setSquadSize] = useState<SquadSize | null>(null)
  const [formation, setFormation] = useState<Formation | null>(null)
  const [positions, setPositions] = useState<LineupPosition[]>([])
  const [name, setName] = useState('')
  const [labelDisplay, setLabelDisplay] = useState<LabelDisplay>(DEFAULT_LABEL_DISPLAY)
  const [subs, setSubs] = useState<SubEntry[]>([])
  const [teamColor, setTeamColor] = useState<string | undefined>(undefined)
  const [keeperColor, setKeeperColor] = useState<string | undefined>(undefined)
  const [pitchStyle, setPitchStyle] = useState<PitchStyle>(DEFAULT_PITCH_STYLE)
  const [markerStyle, setMarkerStyle] = useState<MarkerStyle>(DEFAULT_MARKER_STYLE)

  const [formationPickerOpen, setFormationPickerOpen] = useState(false)
  const [appearanceSheetOpen, setAppearanceSheetOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<LineupPosition | null>(null)
  const [subSheetOpen, setSubSheetOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<SubEntry | null>(null)
  const [saveSheetOpen, setSaveSheetOpen] = useState(false)
  const [exportSheetOpen, setExportSheetOpen] = useState(false)
  // Only used when the lineup has no name of its own yet — exporting never writes to the library.
  const [exportName, setExportName] = useState('')
  const { busy: exporting, share } = useShareExport()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 })

  // Read inside the beforeRemove listener instead of the closured state — mirrors CanvasScreen's
  // savedAtHistoryIndex check, avoiding a stale closure when a save flow calls navigation.goBack()
  // in the same tick as clearing the dirty flag, before this effect has re-subscribed.
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (!lineupId) return
    lineupRepository.getById(lineupId).then((loaded) => {
      if (!loaded) return
      setSquadSize(loaded.squadSize)
      setFormation(loaded.formation ?? null)
      setPositions(loaded.positions)
      setName(loaded.name)
      setLabelDisplay(loaded.labelDisplay ?? DEFAULT_LABEL_DISPLAY)
      setSubs(loaded.subs ?? [])
      setTeamColor(loaded.teamColor)
      setKeeperColor(loaded.keeperColor)
      setPitchStyle(loaded.pitchStyle ?? DEFAULT_PITCH_STYLE)
      setMarkerStyle(loaded.markerStyle ?? DEFAULT_MARKER_STYLE)
      setPhase('pitch')
    })
  }, [lineupId])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      Alert.alert('Discard changes?', undefined, [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ])
    })
    return unsubscribe
  }, [navigation])

  const handleAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setAreaSize({ width, height })
  }, [])

  const aspectRatio = getPitchAspectRatio('full-pitch')
  const availableWidth = Math.max(areaSize.width - CANVAS_MARGIN * 2, 0)
  const availableHeight = Math.max(areaSize.height - CANVAS_MARGIN * 2, 0)
  let canvasWidth = availableWidth
  let canvasHeight = canvasWidth / aspectRatio
  if (canvasHeight > availableHeight && availableHeight > 0) {
    canvasHeight = availableHeight
    canvasWidth = canvasHeight * aspectRatio
  }

  const handleSelectSquadSize = useCallback((size: SquadSize) => {
    setSquadSize(size)
    setFormation(null)
    setPositions([])
    dirtyRef.current = true
    setPhase('pitch')
    setFormationPickerOpen(true)
  }, [])

  const handleChangeSquadSizePress = useCallback(() => {
    if (positions.length === 0) {
      setPhase('squad-size')
      return
    }
    Alert.alert('Change squad size?', 'This will discard the current player positions.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change', style: 'destructive', onPress: () => setPhase('squad-size') },
    ])
  }, [positions.length])

  const handleSelectFormation = useCallback(
    (next: Formation) => {
      if (!squadSize) return
      setFormation(next)
      setPositions((prev) => {
        // The squad is the same eleven players in a new shape, so their names and numbers move
        // onto the new slots rather than being thrown away. Changing SQUAD SIZE is the case that
        // still resets — it clears positions first, which makes this a no-op.
        const carried = carryOverPlayers(prev, getFormationSlots(squadSize, next))
        // Gap-fill around whatever numbers just came across, so a coach already looking at numbers
        // sees the preserved ones plus fresh numbers for any player who never had one.
        return labelDisplay === 'number' ? assignShirtNumbers(carried) : carried
      })
      dirtyRef.current = true
    },
    [squadSize, labelDisplay]
  )

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => prev.map((position) => (position.id === id ? { ...position, x, y } : position)))
    dirtyRef.current = true
  }, [])

  const handleMarkerPress = useCallback(
    (id: string) => {
      setEditingPosition(positions.find((position) => position.id === id) ?? null)
    },
    [positions]
  )

  const handleSavePosition = useCallback(
    (patch: { role?: string; label: string; shirtNumber?: number }) => {
      if (!editingPosition) return
      setPositions((prev) => prev.map((position) => (position.id === editingPosition.id ? { ...position, ...patch } : position)))
      dirtyRef.current = true
    },
    [editingPosition]
  )

  const handleSelectLabelDisplay = useCallback((next: LabelDisplay) => {
    setLabelDisplay(next)
    // Numbers are invented the moment the coach first asks to see them, and only for players who
    // don't have one yet — so overrides survive, and a formation change (which replaces every
    // position with a fresh numberless slot) refills on the next visit to this mode. Switching
    // AWAY deliberately does nothing: the numbers stay stored, just unrendered, so a trip through
    // blank/position and back shows exactly the same numbers.
    if (next === 'number') setPositions((prev) => assignShirtNumbers(prev))
    dirtyRef.current = true
  }, [])

  const handleSelectTeamColor = useCallback((color: string) => {
    setTeamColor(color)
    dirtyRef.current = true
  }, [])

  const handleSelectKeeperColor = useCallback((color: string) => {
    setKeeperColor(color)
    dirtyRef.current = true
  }, [])

  const handleSelectPitchStyle = useCallback((next: PitchStyle) => {
    setPitchStyle(next)
    dirtyRef.current = true
  }, [])

  const handleSelectMarkerStyle = useCallback((next: MarkerStyle) => {
    setMarkerStyle(next)
    dirtyRef.current = true
  }, [])

  const handleAddSubPress = useCallback(() => {
    setEditingSub(null)
    setSubSheetOpen(true)
  }, [])

  const handleSubPress = useCallback((sub: SubEntry) => {
    setEditingSub(sub)
    setSubSheetOpen(true)
  }, [])

  const handleSaveSub = useCallback(
    (patch: { name: string; position?: string }) => {
      dirtyRef.current = true
      if (editingSub) {
        setSubs((prev) => prev.map((sub) => (sub.id === editingSub.id ? { ...sub, ...patch } : sub)))
      } else {
        setSubs((prev) => [...prev, { id: randomUUID(), ...patch }])
      }
    },
    [editingSub]
  )

  const handleRemoveSub = useCallback(() => {
    if (!editingSub) return
    dirtyRef.current = true
    setSubs((prev) => prev.filter((sub) => sub.id !== editingSub.id))
  }, [editingSub])

  const handleSave = useCallback(
    async (trimmedName: string) => {
      if (!squadSize) return
      setSaving(true)
      setSaveError(null)
      try {
        const input: CreateLineupInput = {
          name: trimmedName,
          squadSize,
          formation: formation ?? undefined,
          positions,
          labelDisplay,
          subs,
          teamColor,
          keeperColor,
          pitchStyle,
          markerStyle,
        }
        if (lineupId) {
          await lineupRepository.update(lineupId, input)
        } else {
          await lineupRepository.create(input)
        }
        dirtyRef.current = false
        setSaveSheetOpen(false)
        navigation.goBack()
      } catch {
        setSaveError('Could not save. Try again.')
      } finally {
        setSaving(false)
      }
    },
    [squadSize, formation, positions, labelDisplay, subs, teamColor, keeperColor, pitchStyle, markerStyle, lineupId, navigation]
  )

  const handleShare = useCallback(() => {
    if (!squadSize) return
    // Reads live editor state, so an in-progress lineup exports exactly like a saved one —
    // LineupEditorScreen is the only lineup surface, and it holds all of this whether or not
    // lineupId exists.
    return share(
      () => setExportSheetOpen(false),
      () =>
        exportLineup(
          {
            name: name.trim() || exportName.trim(),
            squadSize,
            formation: formation ?? undefined,
            positions,
            labelDisplay,
            markerStyle,
            pitchStyle,
            teamColor,
            keeperColor,
            subs,
          },
          { detail: 'simple' }
        )
    )
  }, [
    share,
    name,
    exportName,
    squadSize,
    formation,
    positions,
    labelDisplay,
    markerStyle,
    pitchStyle,
    teamColor,
    keeperColor,
    subs,
  ])

  const isPitchEmpty = positions.length === 0

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={layout.hitSlop} style={styles.topBarButton}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {name || 'New Lineup'}
        </Text>
        <View style={styles.topBarActions}>
          {squadSize ? (
            <>
              <Pressable onPress={handleChangeSquadSizePress} hitSlop={layout.hitSlop} style={styles.squadSizeButton}>
                <Text style={styles.squadSizeLabel}>
                  {squadSize}v{squadSize}
                </Text>
              </Pressable>
              <Pressable onPress={() => setFormationPickerOpen(true)} hitSlop={layout.hitSlop} style={styles.topBarButton}>
                <LayoutGrid size={22} color={colors.textPrimary} />
              </Pressable>
              {/* No standalone label toggle here: what a marker says is now a three-way choice
                  living with the rest of the look, in the Appearance sheet below. */}
              <Pressable onPress={() => setAppearanceSheetOpen(true)} hitSlop={layout.hitSlop} style={styles.topBarButton}>
                <Palette size={22} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => setExportSheetOpen(true)}
                disabled={isPitchEmpty}
                hitSlop={layout.hitSlop}
                style={styles.topBarButton}
              >
                <Share2 size={22} color={isPitchEmpty ? colors.textDisabled : colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => setSaveSheetOpen(true)}
                disabled={isPitchEmpty}
                hitSlop={layout.hitSlop}
                style={styles.topBarButton}
              >
                <Save size={22} color={isPitchEmpty ? colors.textDisabled : colors.textPrimary} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      {phase === 'squad-size' ? (
        <SquadSizePicker onSelect={handleSelectSquadSize} />
      ) : (
        <View style={styles.canvasArea} onLayout={handleAreaLayout}>
          {canvasWidth > 0 && canvasHeight > 0 ? (
            <View style={{ width: canvasWidth, height: canvasHeight }}>
              <View style={[styles.canvasBox, StyleSheet.absoluteFill]}>
                <LineupPitch
                  positions={positions}
                  labelDisplay={labelDisplay}
                  markerStyle={markerStyle}
                  pitchStyle={pitchStyle}
                  teamColor={teamColor}
                  keeperColor={keeperColor}
                  width={canvasWidth}
                  height={canvasHeight}
                  onMove={handleMove}
                  onPress={handleMarkerPress}
                />
              </View>
            </View>
          ) : null}
        </View>
      )}

      {phase === 'pitch' ? (
        <View style={styles.subsSection}>
          <Text style={styles.subsLabel}>Subs</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subsRow}>
            {subs.map((sub) => (
              <Pressable key={sub.id} onPress={() => handleSubPress(sub)} style={styles.subChip}>
                <Text style={styles.subChipLabel}>
                  {sub.name}
                  {sub.position ? ` · ${sub.position}` : ''}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={handleAddSubPress} style={[styles.subChip, styles.addSubChip]}>
              <Text style={styles.addSubChipLabel}>+ Add sub</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      {squadSize ? (
        <FormationPicker
          visible={formationPickerOpen}
          squadSize={squadSize}
          selected={formation ?? undefined}
          onSelect={handleSelectFormation}
          onClose={() => setFormationPickerOpen(false)}
        />
      ) : null}

      <PositionEditSheet
        visible={editingPosition !== null}
        position={editingPosition}
        onClose={() => setEditingPosition(null)}
        onSave={handleSavePosition}
      />

      <LineupAppearanceSheet
        visible={appearanceSheetOpen}
        pitchStyle={pitchStyle}
        markerStyle={markerStyle}
        labelDisplay={labelDisplay}
        teamColor={teamColor}
        keeperColor={keeperColor}
        onSelectPitchStyle={handleSelectPitchStyle}
        onSelectMarkerStyle={handleSelectMarkerStyle}
        onSelectLabelDisplay={handleSelectLabelDisplay}
        onSelectTeamColor={handleSelectTeamColor}
        onSelectKeeperColor={handleSelectKeeperColor}
        onClose={() => setAppearanceSheetOpen(false)}
      />

      <SubEditSheet
        visible={subSheetOpen}
        sub={editingSub}
        onClose={() => setSubSheetOpen(false)}
        onSave={handleSaveSub}
        onRemove={handleRemoveSub}
      />

      <ExportSheet
        visible={exportSheetOpen}
        detail="simple"
        detailOptions={[]}
        // No Simple/Full choice: the export is the pitch exactly as arranged. See ExportSheet.
        detailMatters={false}
        nameField={
          name.trim()
            ? undefined
            : { value: exportName, placeholder: 'e.g. Saturday starters', onChange: setExportName }
        }
        hint="A PNG image of the pitch, exactly as arranged. This won't save the lineup."
        busy={exporting}
        error={null}
        onChangeDetail={() => {}}
        onShare={handleShare}
        onClose={() => setExportSheetOpen(false)}
      />

      <LineupSaveSheet
        visible={saveSheetOpen}
        initialName={name}
        saving={saving}
        error={saveError}
        onClose={() => setSaveSheetOpen(false)}
        onSave={handleSave}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  topBarButton: {
    height: layout.touchTarget,
    width: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  squadSizeButton: {
    height: layout.touchTarget,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadSizeLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.canvasInk,
  },
  subsSection: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  subsLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  subsRow: {
    gap: spacing.sm,
  },
  subChip: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subChipLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  addSubChip: {
    backgroundColor: colors.primaryTint,
    borderColor: 'transparent',
  },
  addSubChipLabel: {
    ...typography.label,
    color: colors.primary,
  },
})
