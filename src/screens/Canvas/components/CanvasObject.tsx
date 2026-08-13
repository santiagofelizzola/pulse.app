import { Circle, Group, ImageSVG, Line, Path, Rect, RoundedRect, Skia } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'

import { canvas, colors } from '../../../theme/theme'
import { CONE_DEFAULT_COLOR, EQUIPMENT_ASSETS, useEquipmentSvg, type EquipmentAssetKey } from '../../../utils/canvasUtils'
import type { ShapeToolType } from '../../../store/canvasStore'
import type { PlacedObject } from '../../../types'
import type { CommittedSnapshot, InteractionState } from '../hooks/useCanvasGestures'

interface CanvasObjectProps {
  object: Exclude<PlacedObject, { type: 'player' }>
  canvasSize: { width: number; height: number }
  interaction: SharedValue<InteractionState>
  committed: SharedValue<CommittedSnapshot>
}

const EQUIPMENT_SIZE = canvas.equipment.size

function DiscShape({ color }: { color: string }) {
  const r = EQUIPMENT_SIZE / 2
  return (
    <>
      <Circle cx={0} cy={0} r={r} color={color} style="fill" />
      <Circle cx={0} cy={0} r={r * 0.55} color={colors.surface} style="fill" />
    </>
  )
}

function PoleShape() {
  const width = 6
  return (
    <RoundedRect
      x={-width / 2}
      y={-EQUIPMENT_SIZE / 2}
      width={width}
      height={EQUIPMENT_SIZE}
      r={width / 2}
      color={colors.canvasInk}
      style="fill"
    />
  )
}

function FlagShape() {
  const half = EQUIPMENT_SIZE / 2
  const poleX = -half + 2
  return (
    <>
      <Line p1={{ x: poleX, y: half }} p2={{ x: poleX, y: -half }} color={colors.canvasInk} strokeWidth={2} strokeCap="round" />
      <Path path={`M ${poleX} ${-half} L ${half} ${-half * 0.5} L ${poleX} 0 Z`} color={colors.canvasInk} style="fill" />
    </>
  )
}

// Renders the SVG at its own intrinsic size, then scales it to `targetWidth` via a Group
// transform rather than ImageSVG's own width/height props. Skia's drawSvg container-size
// scaling doesn't reliably resize the content on-device (it still renders near the SVG's
// native size), so scaling through a transform — already proven correct for positioning — sidesteps that.
function EquipmentSvgShape({
  assetKey,
  targetWidth,
  recolor,
}: {
  assetKey: EquipmentAssetKey
  targetWidth?: number
  recolor?: string
}) {
  const svg = useEquipmentSvg(assetKey, recolor)
  if (!svg) return null
  const svgWidth = svg.width()
  const svgHeight = svg.height()
  const width = targetWidth ?? EQUIPMENT_ASSETS[assetKey].nativeWidth
  const scale = width / svgWidth
  return (
    <Group transform={[{ scale }]}>
      <ImageSVG svg={svg} x={-svgWidth / 2} y={-svgHeight / 2} width={svgWidth} height={svgHeight} />
    </Group>
  )
}

// Rectangle shape (Shapes tool). Unlike every other object, its footprint resizes
// independently in width/height rather than through the shared uniform `scale` multiplier —
// see useCanvasGestures.ts's 'resize' mode — so its dimensions are read from the live
// interaction state directly, the same way CanvasObject's `transform` reads live dx/dy/rotation.
function ZoneShape({
  object,
  canvasSize,
  interaction,
  committed,
}: {
  object: Extract<PlacedObject, { type: 'zone' }>
  canvasSize: { width: number; height: number }
  interaction: SharedValue<InteractionState>
  committed: SharedValue<CommittedSnapshot>
}) {
  const rect = useDerivedValue(() => {
    const live = interaction.value
    const isResizing = live.targetId === object.id && live.mode === 'resize'
    // Committed width/height read from the snapshot for the same reason as the transform above
    // — a resize commit hands off across the same reconciler boundary a move does.
    const c = committed.value.objects[object.id]
    const width = isResizing ? live.resizeWidth : (c ? c.width : object.width) * canvasSize.width
    const height = isResizing ? live.resizeHeight : (c ? c.height : object.height) * canvasSize.height
    return Skia.XYWHRect(-width / 2, -height / 2, width, height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.id, object.width, object.height, canvasSize.width, canvasSize.height])

  return <Rect rect={rect} color={colors.canvasInk} style="stroke" strokeWidth={1} />
}

// Circle shape (Shapes tool) — resizes uniformly via the outer Group's `transform`, same as
// every non-zone object, so no live-interaction read is needed here.
function CircleZoneShape({
  object,
  canvasSize,
}: {
  object: Extract<PlacedObject, { type: 'circle-zone' }>
  canvasSize: { width: number; height: number }
}) {
  const r = object.radius * canvasSize.width
  return <Circle cx={0} cy={0} r={r} color={colors.canvasInk} style="stroke" strokeWidth={1} />
}

export function CanvasObject({ object, canvasSize, interaction, committed }: CanvasObjectProps) {
  const transform = useDerivedValue(() => {
    // Base geometry comes from the `committed` shared value, NOT this worklet's captured
    // `object` prop. That prop arrives on Skia's own reconciler schedule, which this app's
    // React tree can't order against — reading it here is what let a cleared interaction pair
    // with a stale pre-drag position (see CommittedSnapshot in useCanvasGestures.ts). The prop
    // remains as the first-mount fallback, before the snapshot's first write lands.
    const c = committed.value.objects[object.id]
    const baseX = (c ? c.x : object.x) * canvasSize.width
    const baseY = (c ? c.y : object.y) * canvasSize.height
    const baseRotation = c ? c.rotation : object.rotation
    const baseScale = c ? c.scale : object.scale

    const live = interaction.value
    const isTarget = live.targetId === object.id

    // While dragging, position is the drag-start point frozen in `interaction` plus the live
    // delta — both from the same struct, so an in-flight drag never reads committed state.
    const x = isTarget && live.mode === 'move' ? live.startX + live.dx : baseX
    const y = isTarget && live.mode === 'move' ? live.startY + live.dy : baseY
    const rotation = isTarget && live.mode === 'rotate' ? live.rotation : baseRotation
    const scale = isTarget && live.mode === 'scale' ? live.scale : baseScale

    return [{ translateX: x }, { translateY: y }, { rotate: rotation }, { scale }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.x, object.y, object.rotation, object.scale, canvasSize.width, canvasSize.height])

  switch (object.type) {
    case 'cone':
      return (
        <Group transform={transform}>
          <EquipmentSvgShape assetKey="cone" recolor={object.color ?? CONE_DEFAULT_COLOR} />
        </Group>
      )
    case 'disc':
      return (
        <Group transform={transform}>
          <DiscShape color={object.color ?? colors.canvasInk} />
        </Group>
      )
    case 'pole':
      return (
        <Group transform={transform}>
          <PoleShape />
        </Group>
      )
    case 'flag':
      return (
        <Group transform={transform}>
          <FlagShape />
        </Group>
      )
    case 'ladder':
      return (
        <Group transform={transform}>
          <EquipmentSvgShape assetKey="ladder" />
        </Group>
      )
    case 'ball':
      return (
        <Group transform={transform}>
          <EquipmentSvgShape assetKey={object.variant === 'color' ? 'ball-color' : 'ball-bw'} />
        </Group>
      )
    case 'goal':
      return (
        <Group transform={transform}>
          <EquipmentSvgShape assetKey="goal" targetWidth={object.width * canvasSize.width} />
        </Group>
      )
    case 'mini-goal':
      return (
        <Group transform={transform}>
          <EquipmentSvgShape assetKey="mini-goal" targetWidth={object.width * canvasSize.width} />
        </Group>
      )
    case 'zone':
      return (
        <Group transform={transform}>
          <ZoneShape object={object} canvasSize={canvasSize} interaction={interaction} committed={committed} />
        </Group>
      )
    case 'circle-zone':
      return (
        <Group transform={transform}>
          <CircleZoneShape object={object} canvasSize={canvasSize} />
        </Group>
      )
    default:
      return null
  }
}

interface ShapePlacePreviewProps {
  type: ShapeToolType
  interaction: SharedValue<InteractionState>
}

// Live preview while a shape-placement drag is in progress (tool armed, finger down but not yet
// released) — mirrors ArrowDrawPreview's approach (see ArrowPath.tsx): reads live drag points
// straight off the shared interaction value so this can stay mounted for as long as the tool is
// armed, resolving to a zero-size (invisible) shape whenever the gesture isn't actively placing.
export function ShapePlacePreview({ type, interaction }: ShapePlacePreviewProps) {
  const rect = useDerivedValue(() => {
    const live = interaction.value
    if (live.mode !== 'placeShape') return Skia.XYWHRect(0, 0, 0, 0)
    const x = Math.min(live.drawStart.x, live.drawCurrent.x)
    const y = Math.min(live.drawStart.y, live.drawCurrent.y)
    return Skia.XYWHRect(x, y, Math.abs(live.drawCurrent.x - live.drawStart.x), Math.abs(live.drawCurrent.y - live.drawStart.y))
  })

  const cx = useDerivedValue(() => {
    const live = interaction.value
    return live.mode === 'placeShape' ? (live.drawStart.x + live.drawCurrent.x) / 2 : 0
  })
  const cy = useDerivedValue(() => {
    const live = interaction.value
    return live.mode === 'placeShape' ? (live.drawStart.y + live.drawCurrent.y) / 2 : 0
  })
  const r = useDerivedValue(() => {
    const live = interaction.value
    if (live.mode !== 'placeShape') return 0
    return Math.hypot(live.drawCurrent.x - live.drawStart.x, live.drawCurrent.y - live.drawStart.y) / 2
  })

  if (type === 'shape-rect') {
    return <Rect rect={rect} color={colors.canvasInk} style="stroke" strokeWidth={1} />
  }
  return <Circle cx={cx} cy={cy} r={r} color={colors.canvasInk} style="stroke" strokeWidth={1} />
}
