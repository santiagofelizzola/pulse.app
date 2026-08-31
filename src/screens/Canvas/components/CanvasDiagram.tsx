import { useMemo, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Canvas } from '@shopify/react-native-skia'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'

import type { Arrow, CanvasData, PlacedObject, PlayerMarker } from '../../../types'
import { ArrowPath } from './ArrowPath'
import { CanvasObject } from './CanvasObject'
import { PitchBackground } from './PitchBackground'
import { PlayerMarkerOverlay } from './PlayerMarkerOverlay'
import { EMPTY_SNAPSHOT, IDLE_STATE, type CommittedSnapshot, type InteractionState } from '../hooks/useCanvasGestures'

interface CanvasDiagramProps {
  canvasData: CanvasData
  width: number
  height: number
  // Live gesture state. Both are optional so a read-only caller (the export templates, a future
  // detail-screen preview) gets a static render with no gesture engine attached — see
  // useStaticInteraction below.
  interaction?: SharedValue<InteractionState>
  committed?: SharedValue<CommittedSnapshot>
  selectedId?: string | null
  // Editor-only Skia nodes painted above the committed content — the in-progress arrow and
  // shape previews. They have to live INSIDE this component's <Canvas> (Skia children can't be
  // handed in from an ordinary RN parent), hence a slot rather than a sibling. Export callers
  // pass nothing.
  skiaOverlay?: ReactNode
}

function isPlayerMarker(object: PlacedObject): object is PlayerMarker {
  return object.type === 'player'
}

// Inert stand-ins for the gesture engine's two shared values. Every consumer already treats
// "no entry in the snapshot" as "use the prop" and "targetId !== mine" as "not being dragged",
// so an idle pair renders committed geometry exactly — no separate static component tree, and
// no way for an export to drift from what the editor draws.
function useStaticInteraction() {
  const interaction = useSharedValue<InteractionState>(IDLE_STATE)
  const committed = useSharedValue<CommittedSnapshot>(EMPTY_SNAPSHOT)
  return { interaction, committed }
}

// The pitch and everything on it, with no chrome, no gestures and no selection — the piece
// shared by the editor (CanvasScreen wraps this in a GestureDetector and layers its selection
// overlay on top) and the export renderer (which mounts it alone at artifact size).
//
// This is deliberately a composition of the editor's OWN components rather than a parallel
// drawing implementation: the same reasoning MarkerVisual already applies to the lineup marker
// and its Appearance-sheet preview. An export that draws its own pitch is an export that
// silently stops matching the app.
export function CanvasDiagram({
  canvasData,
  width,
  height,
  interaction,
  committed,
  selectedId = null,
  skiaOverlay,
}: CanvasDiagramProps) {
  const fallback = useStaticInteraction()
  const liveInteraction = interaction ?? fallback.interaction
  const liveCommitted = committed ?? fallback.committed

  const { background, objects, arrows } = canvasData
  const canvasSize = { width, height }

  const playerObjects = objects.filter(isPlayerMarker)
  const otherObjects = objects.filter((object): object is Exclude<PlacedObject, PlayerMarker> => !isPlayerMarker(object))

  // Arrows and equipment paint in one shared stacking order (design.md's "Layering" intent) so a
  // line genuinely rises above equipment, not just above other lines.
  // Player markers are excluded — they always render via the RN overlay below, on top of
  // everything in the Skia canvas regardless of zIndex, which is an unrelated, pre-existing
  // constraint of how their text labels are drawn.
  const paintOrder = useMemo(() => {
    const items: Array<{ kind: 'arrow'; arrow: Arrow } | { kind: 'object'; object: Exclude<PlacedObject, PlayerMarker> }> = [
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
    <>
      <Canvas style={StyleSheet.absoluteFill}>
        <PitchBackground background={background} width={width} height={height} />
        {paintOrder.map((item) =>
          item.kind === 'arrow' ? (
            <ArrowPath
              key={item.arrow.id}
              arrow={item.arrow}
              canvasSize={canvasSize}
              isSelected={selectedId === item.arrow.id}
              interaction={liveInteraction}
              committed={liveCommitted}
            />
          ) : (
            <CanvasObject
              key={item.object.id}
              object={item.object}
              canvasSize={canvasSize}
              interaction={liveInteraction}
              committed={liveCommitted}
            />
          )
        )}
        {skiaOverlay}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {playerObjects.map((object) => (
          <PlayerMarkerOverlay
            key={object.id}
            object={object}
            canvasSize={canvasSize}
            interaction={liveInteraction}
            committed={liveCommitted}
          />
        ))}
      </View>
    </>
  )
}
