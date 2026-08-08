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

function ConeShape({ color }: { color: string }) {
  const half = EQUIPMENT_SIZE / 2
  return <Path path={`M 0 ${-half} L ${half * 0.62} ${half * 0.77} L ${half} ${half * 0.77} L ${half} ${half} L ${-half} ${half} L ${-half} ${half * 0.77} L ${-half * 0.62} ${half * 0.77} Z`} color={color} style="fill" />
}

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

function EquipmentSvgShape({ assetKey }: { assetKey: EquipmentAssetKey }) {
  const svg = useEquipmentSvg(assetKey)
  const config = EQUIPMENT_ASSETS[assetKey]
  const width = config.nativeWidth
  const height = width / config.aspectRatio
  if (!svg) return null
  return <ImageSVG svg={svg} x={-width / 2} y={-height / 2} width={width} height={height} />
}

function GoalShape({ assetKey, widthPx }: { assetKey: 'goal' | 'mini-goal'; widthPx: number }) {
  const svg = useEquipmentSvg(assetKey)
  const heightPx = widthPx / EQUIPMENT_ASSETS[assetKey].aspectRatio
  if (!svg) return null
  return <ImageSVG svg={svg} x={-widthPx / 2} y={-heightPx / 2} width={widthPx} height={heightPx} />
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
          <ConeShape color={object.color ?? colors.canvasInk} />
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
          <GoalShape assetKey="goal" widthPx={object.width * canvasSize.width} />
        </Group>
      )
    case 'mini-goal':
      return (
        <Group transform={transform}>
          <GoalShape assetKey="mini-goal" widthPx={object.width * canvasSize.width} />
        </Group>
      )
    default:
      return null
  }
}
