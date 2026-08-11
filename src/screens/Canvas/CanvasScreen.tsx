import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { Canvas } from '@shopify/react-native-skia'
import { LayoutGrid, Redo2, Save, Undo2, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { activityRepository } from '../../db/repositories/activityRepository'
import { canvas, colors, layout, spacing, typography } from '../../theme/theme'
import { captureCanvasThumbnail } from '../../utils/thumbnailUtils'
import type { PlaceableToolType } from '../../store/canvasStore'
import type { ActivityTag, CanvasBackground, CanvasData, PlacedObject, PlayerMarker } from '../../types'
import { ArrowDrawPreview, ArrowPath } from './components/ArrowPath'
import { BackgroundPicker } from './components/BackgroundPicker'
import { CanvasObject } from './components/CanvasObject'
import { PitchBackground } from './components/PitchBackground'
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
    hasUnsavedChanges,
    selectTool,
    selectBackground,
    place,
    moveObject,
    rotateObject,
    scaleObject,
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
      if (!hasUnsavedChanges) return
      event.preventDefault()
      Alert.alert('Discard changes?', undefined, [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ])
    })
    return unsubscribe
  }, [navigation, hasUnsavedChanges])

  const handleAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setAreaSize({ width, height })
  }, [])

  // Fit the pitch (canvas.pitchAspectRatio) into the middle flex area, centered, so it's never
  // stretched and never overlaps the top bar or tool tray (both sit outside this area now).
  const availableWidth = Math.max(areaSize.width - CANVAS_MARGIN * 2, 0)
  const availableHeight = Math.max(areaSize.height - CANVAS_MARGIN * 2, 0)

  let canvasWidth = availableWidth
  let canvasHeight = canvasWidth / canvas.pitchAspectRatio
  if (canvasHeight > availableHeight && availableHeight > 0) {
    canvasHeight = availableHeight
    canvasWidth = canvasHeight * canvas.pitchAspectRatio
  }

  const canvasSize = { width: canvasWidth, height: canvasHeight }

  const handlePlace = useCallback(
    (toolType: PlaceableToolType, x: number, y: number) => {
      place(toolType, x, y, canvasSize)
    },
    [place, canvasSize]
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
    onDrawArrow: drawArrow,
    onMoveArrow: moveArrow,
  })

  const handleSave = useCallback(
    async ({ name, tag }: { name: string; tag?: ActivityTag }) => {
      setSaving(true)
      setSaveError(null)
      try {
        deselectAll()
        await waitForNextFrame()

        const thumbnailUri = await captureCanvasThumbnail(canvasBoxRef)
        const canvasData: CanvasData = { version: 1, background, objects, arrows }
        await activityRepository.create({ name, tag, canvasData, thumbnailUri })

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

  const playerObjects = objects.filter(isPlayerMarker)
  const otherObjects = objects.filter((object): object is Exclude<PlacedObject, PlayerMarker> => !isPlayerMarker(object))
  const isCanvasEmpty = objects.length === 0 && arrows.length === 0

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
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
      </View>

      <View style={styles.canvasArea} onLayout={handleAreaLayout}>
        {canvasWidth > 0 && canvasHeight > 0 ? (
          <View style={{ width: canvasWidth, height: canvasHeight }}>
            <GestureDetector gesture={pan}>
              <View ref={canvasBoxRef} style={[styles.canvasBox, StyleSheet.absoluteFill]}>
                <Canvas style={StyleSheet.absoluteFill}>
                  <PitchBackground background={background} width={canvasWidth} height={canvasHeight} />
                  {arrows.map((arrow) => (
                    <ArrowPath
                      key={arrow.id}
                      arrow={arrow}
                      canvasSize={canvasSize}
                      isSelected={selected?.kind === 'arrow' && selected.arrow.id === arrow.id}
                      interaction={interaction}
                    />
                  ))}
                  {otherObjects.map((object) => (
                    <CanvasObject key={object.id} object={object} canvasSize={canvasSize} interaction={interaction} />
                  ))}
                  {tool.kind === 'draw' ? <ArrowDrawPreview type={tool.type} interaction={interaction} /> : null}
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
              onBringToFront={bringSelectedToFront}
              onDelete={deleteSelected}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.toolTray, { paddingBottom: insets.bottom + spacing.sm }]}>
        <ToolPalette activeTool={tool} onSelectTool={selectTool} />
      </View>

      <BackgroundPicker
        visible={pickerOpen}
        selected={background}
        onSelect={handleSelectBackground}
        onClose={() => setPickerOpen(false)}
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
