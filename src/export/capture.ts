import type { RefObject } from 'react'
import { PixelRatio, type View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

// The widest artifact we emit. Above roughly this, messaging apps throw the pixels away:
// WhatsApp re-encodes images down to ~1600px on the long edge, and a 1080px-wide artifact shown
// at ~390pt on a phone is already ~2.8x — it pinch-zooms to about 1:1 on a 3x screen.
export const MAX_ARTIFACT_WIDTH_PX = 1080

export interface CaptureResult {
  uri: string
  widthPx: number
  heightPx: number
}

/**
 * The layout width, in points, to render an artifact at so the capture lands at (or under) the
 * pixel ceiling.
 *
 * Resolution is bought with LAYOUT SIZE, not with a capture option. view-shot's width/height are
 * the size of the render context in POINTS, which RNViewShot.mm then rasterizes at the device
 * scale (rendererFormat.scale = 0) — so passing width: 1080 asks for a 1080-point context and
 * yields a 3240px image on a 3x phone, not a 1080px one. Omitting them entirely captures the
 * view's own bounds at device scale, which is exactly what captureCanvasThumbnail already does
 * and the one path in this app proven to work on device.
 *
 * On a 3x phone this returns 360pt -> 1080px. On a 2x phone it wants 540pt but the screen caps
 * it at ~375pt -> 750px, the documented floor. Never upscales, because there is nothing to
 * upscale from.
 */
export function targetLayoutWidth(availableWidthPt: number, maxWidthPx: number = MAX_ARTIFACT_WIDTH_PX): number {
  return Math.min(availableWidthPt, maxWidthPx / PixelRatio.get())
}

/** What a capture at this layout size will actually produce, in pixels. */
export function expectedPixelSize(layoutWidthPt: number, layoutHeightPt: number): { widthPx: number; heightPx: number } {
  const scale = PixelRatio.get()
  return {
    widthPx: Math.round(layoutWidthPt * scale),
    heightPx: Math.round(layoutHeightPt * scale),
  }
}

interface CaptureImageOptions {
  layoutWidthPt: number
  layoutHeightPt: number
  format?: 'png' | 'jpg'
  // Lossy formats only; ignored for png.
  quality?: number
}

/**
 * Captures a mounted, on-screen view to an image file in the OS temp directory.
 *
 * The view MUST be attached to a window and within screen bounds. RNViewShot.mm uses
 * drawViewHierarchyInRect:afterScreenUpdates:YES, whose own source comment warns it "doesn't
 * work for large views and reports incorrect success even though the image is blank" — an
 * offscreen or oversized target is exactly that failure. ExportRenderHost is what guarantees
 * this by rendering the artifact on screen behind an opaque scrim.
 *
 * useRenderInContext is deliberately NOT set: layer.renderInContext: cannot capture the
 * CAMetalLayer that react-native-skia draws the pitch into, so it would return the RN marker
 * layer over a blank pitch.
 */
export async function captureView(
  ref: RefObject<View | null>,
  { layoutWidthPt, layoutHeightPt, format = 'png', quality = 1 }: CaptureImageOptions
): Promise<CaptureResult> {
  const uri = await captureRef(ref, {
    format,
    quality,
    result: 'tmpfile',
    // react-native-skia renders into a TextureView on Android, which ViewShot.java handles by
    // calling getBitmap() on it. Setting this covers the SurfaceView path too, so a future Skia
    // backing-view change can't silently turn every Android export's pitch blank.
    handleGLSurfaceViewOnAndroid: true,
  })

  return { uri, ...expectedPixelSize(layoutWidthPt, layoutHeightPt) }
}
