import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { Canvas } from '@shopify/react-native-skia'
import { LayoutGrid, Redo2, Save, Undo2, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { activityRepository } from '../../db/repositories/activityRepository'
import { useCanvasStore } from '../../store/canvasStore'
import { colors, layout, spacing, typography } from '../../theme/theme'
import { captureCanvasThumbnail } from '../../utils/thumbnailUtils'
import type { PlaceableToolType, ShapeToolType } from '../../store/canvasStore'
import type { ActivityTag, CanvasBackground, CanvasData, PlacedObject, PlayerMarker } from '../../types'
import { ArrowDrawPreview, ArrowPath } from './components/ArrowPath'
import { BackgroundPicker } from './components/BackgroundPicker'
import { CanvasObject, ShapePlacePreview } from './components/CanvasObject'
import { ColorPicker } from './components/ColorPicker'
import { getPitchAspectRatio, PitchBackground } from './components/PitchBackground'
import { PlayerMarkerOverlay } from './components/PlayerMarkerOverlay'
import { SaveSheet } from './components/SaveSheet'
import { SelectionOverlay } from './components/SelectionOverlay'
import { ToolPalette } from './components/ToolPalette'
import { useCanvasGestures } from './hooks/useCanvasGestures'
import { useCanvasState } from './hooks/useCanvasState'

function isPlayerMarker(object: PlacedObject): object is PlayerMarker {
  return object.type === 'player'
}

// Breathing room around the pitch within its flex:1 area, so it never touches the top-bar/tool-tray edges.
const CANVAS_MARGIN = spacing.lg

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

export default function CanvasScreen() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const {
    background,
    objects,
    arrows,
    tool,
    selected,
    canUndo,
    canRedo,
    selectTool,
    selectBackground,
    place,
    placeShape,
    moveObject,
    rotateObject,
    scaleObject,
    resizeObject,
    setObjectColor,
    drawArrow,
    moveArrow,
    selectItem,
    deselectAll,
    duplicateSelected,
    bringSelectedToFront,
    deleteSelected,
    undo,
    redo,
    markSaved,
    reset,
  } = useCanvasState()

  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [saveSheetOpen, setSaveSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const canvasBoxRef = useRef<View>(null)

  // The canvas store is a module-level singleton, so it outlives this screen — reset it on
  // unmount (covers save, discard, and plain back/swipe alike) so the next time a coach opens
  // the Training tab they get a blank canvas, not whatever was left over from the last drill.
  useEffect(() => {
    return () => reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      // Reads the store directly instead of the closured `hasUnsavedChanges` — handleSave calls
      // markSaved() then navigation.goBack() synchronously in the same tick, before React has
      // re-rendered and resubscribed this listener with a fresh closure. A stale closure here
      // would still see "unsaved" and show the discard prompt right after a successful save.
      const state = useCanvasStore.getState()
      if (state.historyIndex === state.savedAtHistoryIndex) return
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

  // Fit the pitch into the middle flex area, centered, so it's never stretched and never
  // overlaps the top bar or tool tray (both sit outside this area now). The aspect ratio varies
  // by background — a half-pitch or zoomed-box crop shows less of the pitch's length than a
  // full pitch, so its frame is shorter for the same width rather than stretched into the same
  // tall shape with empty grass below (see PitchBackground's getPitchAspectRatio).
  const aspectRatio = getPitchAspectRatio(background)
  const availableWidth = Math.max(areaSize.width - CANVAS_MARGIN * 2, 0)
  const availableHeight = Math.max(areaSize.height - CANVAS_MARGIN * 2, 0)

  let canvasWidth = availableWidth
  let canvasHeight = canvasWidth / aspectRatio
  if (canvasHeight > availableHeight && availableHeight > 0) {
    canvasHeight = availableHeight
    canvasWidth = canvasHeight * aspectRatio
  }

  const canvasSize = { width: canvasWidth, height: canvasHeight }

  const handlePlace = useCallback(
    (toolType: PlaceableToolType, x: number, y: number) => {
      place(toolType, x, y, canvasSize)
    },
    [place, canvasSize]
  )

  const handlePlaceShape = useCallback(
    (type: ShapeToolType, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      placeShape(type, p1, p2, canvasSize)
    },
    [placeShape, canvasSize]
  )

  const handleSelectBackground = useCallback(
    (next: CanvasBackground) => {
      selectBackground(next)
      setPickerOpen(false)
    },
    [selectBackground]
  )

  const { pan, interaction, isInteracting } = useCanvasGestures({
    objects,
    arrows,
    canvasSize,
    tool,
    selected,
    onPlace: handlePlace,
    onSelect: selectItem,
    onMoveObject: moveObject,
    onRotateObject: rotateObject,
    onScaleObject: scaleObject,
    onResizeObject: resizeObject,
    onPlaceShape: handlePlaceShape,
    onDrawArrow: drawArrow,
    onMoveArrow: moveArrow,
  })

  const handleSave = useCallback(
    async ({
      name,
      tag,
      playerCount,
      playerActions,
    }: {
      name: string
      tag?: ActivityTag
      playerCount?: number
      playerActions?: string
    }) => {
      setSaving(true)
      setSaveError(null)
      try {
        deselectAll()
        await waitForNextFrame()

        const thumbnailUri = await captureCanvasThumbnail(canvasBoxRef)
        const canvasData: CanvasData = { version: 1, background, objects, arrows }
        await activityRepository.create({ name, tag, playerCount, playerActions, canvasData, thumbnailUri })

        markSaved()
        setSaveSheetOpen(false)
        navigation.goBack()
      } catch {
        setSaveError('Could not save. Try again.')
      } finally {
        setSaving(false)
      }
    },
    [deselectAll, background, objects, arrows, markSaved, navigation]
  )

  // Cone, Disc, and PlayerMarker are the PlacedObject types carrying a `color` field — gate the
  // toolbar's color action to them (see design.md §7's "Per-object color (cone & disc)",
  // extended to player markers).
  const colorableSelected =
    selected?.kind === 'object' &&
    (selected.object.type === 'cone' || selected.object.type === 'disc' || selected.object.type === 'player')
      ? selected.object
      : null

  const handleSelectColor = useCallback(
    (color: string) => {
      if (colorableSelected) setObjectColor(colorableSelected.id, color)
      setColorPickerOpen(false)
    },
    [colorableSelected, setObjectColor]
  )

  const playerObjects = objects.filter(isPlayerMarker)
  const otherObjects = objects.filter((object): object is Exclude<PlacedObject, PlayerMarker> => !isPlayerMarker(object))
  const isCanvasEmpty = objects.length === 0 && arrows.length === 0

  // Arrows and equipment paint in one shared stacking order (design.md's "Layering" intent) so
  // bring-to-front on a line can actually rise above equipment, not just reorder among lines.
  // Player markers are excluded — they always render via the RN overlay below, on top of
  // everything in the Skia canvas regardless of zIndex, which is an unrelated, pre-existing
  // constraint of how their text labels are drawn.
  const paintOrder = useMemo(() => {
    const items: Array<{ kind: 'arrow'; arrow: (typeof arrows)[number] } | { kind: 'object'; object: (typeof otherObjects)[number] }> = [
      ...arrows.map((arrow) => ({ kind: 'arrow' as const, arrow })),
      ...otherObjects.map((object) => ({ kind: 'object' as const, object })),
    ]
    return items.sort((a, b) => {
      const za = a.kind === 'arrow' ? a.arrow.zIndex : a.object.zIndex
      const zb = b.kind === 'arrow' ? b.arrow.zIndex : b.object.zIndex
      return za - zb
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrows, otherObjects])

  return (
    <View style={styles.container}>
      {/* Pressable so a tap on the bar's background (not one of its own buttons) also dismisses
          the selection toolbar — nested Pressables (the buttons below) still win for their own
          bounds, this only fires for the surrounding chrome. */}
      <Pressable onPress={deselectAll} style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={layout.hitSlop} style={styles.topBarButton}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>New Activity</Text>
        <View style={styles.topBarActions}>
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={layout.hitSlop} style={styles.topBarButton}>
            <LayoutGrid size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={undo} disabled={!canUndo} hitSlop={layout.hitSlop} style={styles.topBarButton}>
            <Undo2 size={22} color={canUndo ? colors.textPrimary : colors.textDisabled} />
          </Pressable>
          <Pressable onPress={redo} disabled={!canRedo} hitSlop={layout.hitSlop} style={styles.topBarButton}>
            <Redo2 size={22} color={canRedo ? colors.textPrimary : colors.textDisabled} />
          </Pressable>
          <Pressable
            onPress={() => setSaveSheetOpen(true)}
            disabled={isCanvasEmpty}
            hitSlop={layout.hitSlop}
            style={styles.topBarButton}
          >
            <Save size={22} color={isCanvasEmpty ? colors.textDisabled : colors.textPrimary} />
          </Pressable>
        </View>
      </Pressable>

      <View style={styles.canvasArea} onLayout={handleAreaLayout}>
        {canvasWidth > 0 && canvasHeight > 0 ? (
          <View style={{ width: canvasWidth, height: canvasHeight }}>
            <GestureDetector gesture={pan}>
              <View ref={canvasBoxRef} style={[styles.canvasBox, StyleSheet.absoluteFill]}>
                <Canvas style={StyleSheet.absoluteFill}>
                  <PitchBackground background={background} width={canvasWidth} height={canvasHeight} />
                  {paintOrder.map((item) =>
                    item.kind === 'arrow' ? (
                      <ArrowPath
                        key={item.arrow.id}
                        arrow={item.arrow}
                        canvasSize={canvasSize}
                        isSelected={selected?.kind === 'arrow' && selected.arrow.id === item.arrow.id}
                        interaction={interaction}
                      />
                    ) : (
                      <CanvasObject key={item.object.id} object={item.object} canvasSize={canvasSize} interaction={interaction} />
                    )
                  )}
                  {tool.kind === 'draw' ? <ArrowDrawPreview type={tool.type} interaction={interaction} /> : null}
                  {tool.kind === 'place' && (tool.type === 'shape-rect' || tool.type === 'shape-circle') ? (
                    <ShapePlacePreview type={tool.type} interaction={interaction} />
                  ) : null}
                </Canvas>
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {playerObjects.map((object) => (
                    <PlayerMarkerOverlay key={object.id} object={object} canvasSize={canvasSize} interaction={interaction} />
                  ))}
                </View>
              </View>
            </GestureDetector>
            {/* SelectionOverlay is a SIBLING of the GestureDetector's view, not a descendant —
                its Pressable toolbar buttons use RN's classic touch responder system, which can
                otherwise race with (and win over) gesture-handler's pan recognizer for touches
                on other parts of the canvas when nested inside the same wrapped view. */}
            <SelectionOverlay
              selected={selected}
              canvasSize={canvasSize}
              hidden={isInteracting}
              onDuplicate={duplicateSelected}
              onColor={colorableSelected ? () => setColorPickerOpen(true) : undefined}
              onBringToFront={bringSelectedToFront}
              onDelete={deleteSelected}
            />
          </View>
        ) : null}
      </View>

      <Pressable onPress={deselectAll} style={[styles.toolTray, { paddingBottom: insets.bottom + spacing.sm }]}>
        <ToolPalette activeTool={tool} onSelectTool={selectTool} />
      </Pressable>

      <BackgroundPicker
        visible={pickerOpen}
        selected={background}
        onSelect={handleSelectBackground}
        onClose={() => setPickerOpen(false)}
      />

      <ColorPicker
        visible={colorPickerOpen}
        selectedColor={colorableSelected?.color}
        onSelect={handleSelectColor}
        onClose={() => setColorPickerOpen(false)}
      />

      <SaveSheet
        visible={saveSheetOpen}
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
  title: {
    ...typography.h3,
    color: colors.textPrimary,
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
  toolTray: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
})
