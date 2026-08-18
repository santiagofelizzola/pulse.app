import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { DIAGRAM_REFERENCE_WIDTH } from './artifactStyles'

interface ScaledDiagramProps {
  // The slot to fill. Height follows from the aspect ratio.
  width: number
  // width / height of the diagram itself.
  aspectRatio: number
  children: (size: { width: number; height: number }) => ReactNode
}

/**
 * Draws a diagram at its reference size and scales the whole thing into the slot.
 *
 * This is what keeps a pitch looking like the app's pitch at any size. Canvas geometry is
 * specified in absolute points — 30pt player markers, 2pt pitch lines, a 20pt pitch margin,
 * 13pt name captions — so rendering directly into a small slot leaves all of it at full size on
 * a shrunken field, which reads as clumsy and oversized rather than smaller. Scaling the
 * rendered result preserves every proportion exactly.
 *
 * Scaling is essentially always DOWN (reference 360pt vs a content box of ~310pt or less), so
 * this costs nothing in sharpness — the layer rasterizes at its natural size and downsamples.
 */
export function ScaledDiagram({ width, aspectRatio, children }: ScaledDiagramProps) {
  const naturalWidth = DIAGRAM_REFERENCE_WIDTH
  const naturalHeight = naturalWidth / aspectRatio
  const scale = width / naturalWidth
  const height = naturalHeight * scale

  return (
    <View style={[styles.slot, { width, height }]}>
      <View
        style={[
          styles.natural,
          { width: naturalWidth, height: naturalHeight, transform: [{ scale }], transformOrigin: 'top left' },
        ]}
      >
        {children({ width: naturalWidth, height: naturalHeight })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  slot: {
    overflow: 'hidden',
    position: 'relative',
  },
  natural: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
})
