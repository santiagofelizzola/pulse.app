import { useCallback, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { Canvas } from '@shopify/react-native-skia'
import { LayoutGrid, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, layout, spacing, typography } from '../../theme/theme'
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

export default function CanvasScreen() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { background, objects, activeTool, selectTool, selectBackground, place, moveObject } = useCanvasState()

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setCanvasSize({ width, height })
  }, [])

  const handlePlace = useCallback(
    (tool: PlaceableToolType, x: number, y: number) => {
      place(tool, x, y, canvasSize)
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

  const { pan, dragState } = useCanvasGestures({
    objects,
    canvasSize,
    activeTool,
    onPlace: handlePlace,
    onMove: moveObject,
  })

  const playerObjects = objects.filter(isPlayerMarker)
  const otherObjects = objects.filter((object): object is Exclude<PlacedObject, PlayerMarker> => !isPlayerMarker(object))

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill} onLayout={handleLayout}>
          <Canvas style={StyleSheet.absoluteFill}>
            <PitchBackground background={background} width={canvasSize.width} height={canvasSize.height} />
            {otherObjects.map((object) => (
              <CanvasObject key={object.id} object={object} canvasSize={canvasSize} dragState={dragState} />
            ))}
          </Canvas>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {playerObjects.map((object) => (
              <PlayerMarkerOverlay key={object.id} object={object} canvasSize={canvasSize} dragState={dragState} />
            ))}
          </View>
        </View>
      </GestureDetector>

      <View style={[styles.topBar, { paddingTop: insets.top }]} pointerEvents="box-none">
        <Pressable onPress={() => navigation.goBack()} hitSlop={layout.hitSlop} style={styles.topBarButton}>
          <X size={22} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.title}>New Activity</Text>
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={layout.hitSlop} style={styles.topBarButton}>
          <LayoutGrid size={22} color={colors.textInverse} />
        </Pressable>
      </View>

      <ToolPalette activeTool={activeTool} onSelectTool={selectTool} bottomInset={insets.bottom} />

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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.overlayBar,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.sm,
  },
  topBarButton: {
    height: layout.touchTarget,
    width: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.textInverse,
  },
})
