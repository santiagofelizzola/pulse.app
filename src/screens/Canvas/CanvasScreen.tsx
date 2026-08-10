import { useCallback, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { Canvas } from '@shopify/react-native-skia'
import { LayoutGrid, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { canvas, colors, layout, spacing, typography } from '../../theme/theme'
import type { PlaceableToolType } from '../../store/canvasStore'
import type { CanvasBackground, PlacedObject, PlayerMarker } from '../../types'
import { BackgroundPicker } from './components/BackgroundPicker'
import { CanvasObject } from './components/CanvasObject'
import { PitchBackground } from './components/PitchBackground'
import { PlayerMarkerOverlay } from './components/PlayerMarkerOverlay'
import { ToolPalette } from './components/ToolPalette'
import { useCanvasGestures } from './hooks/useCanvasGestures'
import { useCanvasState } from './hooks/useCanvasState'

function isPlayerMarker(object: PlacedObject): object is PlayerMarker {
  return object.type === 'player'
}

// Breathing room around the pitch within its flex:1 area, so it never touches the top-bar/tool-tray edges.
const CANVAS_MARGIN = spacing.lg

export default function CanvasScreen() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { background, objects, activeTool, selectTool, selectBackground, place, moveObject } = useCanvasState()

  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 })
  const [pickerOpen, setPickerOpen] = useState(false)

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

  const handlePlace = useCallback(
    (tool: PlaceableToolType, x: number, y: number) => {
      place(tool, x, y, { width: canvasWidth, height: canvasHeight })
    },
    [place, canvasWidth, canvasHeight]
  )

  const handleSelectBackground = useCallback(
    (next: CanvasBackground) => {
      selectBackground(next)
      setPickerOpen(false)
    },
    [selectBackground]
  )

  const { pan, dragState } = useCanvasGestures({
    objects,
    canvasSize: { width: canvasWidth, height: canvasHeight },
    activeTool,
    onPlace: handlePlace,
    onMove: moveObject,
  })

  const playerObjects = objects.filter(isPlayerMarker)
  const otherObjects = objects.filter((object): object is Exclude<PlacedObject, PlayerMarker> => !isPlayerMarker(object))

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={layout.hitSlop} style={styles.topBarButton}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>New Activity</Text>
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={layout.hitSlop} style={styles.topBarButton}>
          <LayoutGrid size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.canvasArea} onLayout={handleAreaLayout}>
        {canvasWidth > 0 && canvasHeight > 0 ? (
          <GestureDetector gesture={pan}>
            <View style={[styles.canvasBox, { width: canvasWidth, height: canvasHeight }]}>
              <Canvas style={StyleSheet.absoluteFill}>
                <PitchBackground background={background} width={canvasWidth} height={canvasHeight} />
                {otherObjects.map((object) => (
                  <CanvasObject
                    key={object.id}
                    object={object}
                    canvasSize={{ width: canvasWidth, height: canvasHeight }}
                    dragState={dragState}
                  />
                ))}
              </Canvas>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {playerObjects.map((object) => (
                  <PlayerMarkerOverlay
                    key={object.id}
                    object={object}
                    canvasSize={{ width: canvasWidth, height: canvasHeight }}
                    dragState={dragState}
                  />
                ))}
              </View>
            </View>
          </GestureDetector>
        ) : null}
      </View>

      <View style={[styles.toolTray, { paddingBottom: insets.bottom + spacing.sm }]}>
        <ToolPalette activeTool={activeTool} onSelectTool={selectTool} />
      </View>

      <BackgroundPicker
        visible={pickerOpen}
        selected={background}
        onSelect={handleSelectBackground}
        onClose={() => setPickerOpen(false)}
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
