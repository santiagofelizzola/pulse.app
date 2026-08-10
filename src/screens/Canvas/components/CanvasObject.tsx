import { Circle, Group, ImageSVG, Line, Path, RoundedRect } from '@shopify/react-native-skia'
import { useDerivedValue, type SharedValue } from 'react-native-reanimated'

import { canvas, colors } from '../../../theme/theme'
import { EQUIPMENT_ASSETS, useEquipmentSvg, type EquipmentAssetKey } from '../../../utils/canvasUtils'
import type { PlacedObject } from '../../../types'
import type { DragState } from '../hooks/useCanvasGestures'

interface CanvasObjectProps {
  object: Exclude<PlacedObject, { type: 'player' }>
  canvasSize: { width: number; height: number }
  dragState: SharedValue<DragState>
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

export function CanvasObject({ object, canvasSize, dragState }: CanvasObjectProps) {
  const transform = useDerivedValue(() => {
    const baseX = object.x * canvasSize.width
    const baseY = object.y * canvasSize.height
    const isDragging = dragState.value.id === object.id
    const x = isDragging ? baseX + dragState.value.dx : baseX
    const y = isDragging ? baseY + dragState.value.dy : baseY
    return [{ translateX: x }, { translateY: y }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.x, object.y, canvasSize.width, canvasSize.height])

  switch (object.type) {
    case 'cone':
      return (
        <Group transform={transform}>
          <EquipmentSvgShape assetKey="cone" recolor={object.color ?? colors.canvasInk} />
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
    default:
      return null
  }
}
