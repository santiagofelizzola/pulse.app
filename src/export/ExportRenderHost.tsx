import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, spacing, typography } from '../theme/theme'
import { captureView, targetLayoutWidth } from './capture'
import { useExportHostStore } from './exportHost'

// Frames to wait after the artifact reports layout, before capturing. React Native has laid the
// views out by then, but Skia renders its children through a separate reconciler started from a
// useLayoutEffect and awaited across a microtask (see the CommittedSnapshot note in
// useCanvasGestures.ts), so the pitch can still be a frame or two behind. The existing thumbnail
// capture waits two frames from an already-painted canvas; a freshly mounted one gets more.
const PAINT_SETTLE_FRAMES = 3
const PAINT_SETTLE_MS = 120

// How many times the host may shrink the artifact and re-measure when its real height overshoots
// the screen. Each pass scales by the exact overshoot ratio, so one is almost always enough.
const MAX_FIT_PASSES = 3

// A job that never reports a usable layout would otherwise leave the coach on a spinner forever
// with no way out. The commonest cause is a template with no intrinsic size — every child
// absolutely positioned, so the capture target measures zero height and the capture never fires.
// Failing loudly turns that into a reportable error instead of a hang.
const LAYOUT_TIMEOUT_MS = 8000

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count
    const tick = () => {
      remaining -= 1
      if (remaining <= 0) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * First guess at the artifact width that keeps its height inside the available screen box,
 * from the spec's own estimate.
 *
 * Height is close to linear in width (the diagram dominates and scales with it, the chrome is
 * roughly constant), so scaling by the overshoot ratio converges in a couple of passes. This
 * only has to be approximately right — the real height is measured after layout below, and the
 * estimate never reaches the captured image.
 */
function estimateFitWidth(
  spec: { measure: (width: number) => number; fixedWidth?: number },
  availableWidth: number,
  availableHeight: number
): number {
  const { measure } = spec
  // A spec with its own page geometry gets exactly that width; everything else starts at the
  // width that yields the pixel ceiling on this device, capped by the screen — resolution comes
  // from layout size here, not from a capture option (see targetLayoutWidth).
  let width = Math.min(spec.fixedWidth ?? targetLayoutWidth(availableWidth), availableWidth)
  for (let pass = 0; pass < MAX_FIT_PASSES + 1; pass += 1) {
    const height = measure(width)
    if (height <= availableHeight) return width
    width = width * (availableHeight / height)
  }
  return width
}

/**
 * Mounts export artifacts so they can be captured, and shows the coach a progress scrim while
 * that happens.
 *
 * The artifact renders ON SCREEN, at full size, inside a Modal — not offscreen and not scaled.
 * That is a hard requirement of the capture path, not a convenience: RNViewShot.mm's
 * drawViewHierarchyInRect warns in its own source that it "reports incorrect success even though
 * the image is blank" for views it cannot render, and Skia's Metal-backed pitch is exactly the
 * kind of layer that goes blank when detached from a presented window.
 *
 * An opaque scrim sits on top so the coach never sees the artifact flash past — they see
 * "Preparing export…". Occlusion by a sibling view does not affect the capture, which re-renders
 * the target view's own subtree.
 *
 * A Modal (rather than anything in the navigation tree) means the editor underneath is never
 * unmounted, re-laid-out or scrolled by an export.
 */
export function ExportRenderHost() {
  const job = useExportHostStore((state) => state.job)
  const status = useExportHostStore((state) => state.status)
  const clear = useExportHostStore((state) => state.clear)
  const cancel = useExportHostStore((state) => state.cancel)

  const captureTargetRef = useRef<View>(null)

  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const availableWidth = screenWidth
  const availableHeight = Math.max(screenHeight - insets.top - insets.bottom, 1)

  // The width currently being rendered, and the height the artifact ACTUALLY laid out at.
  // The capture uses the measured height, never the spec's estimate, so an estimate that is off
  // costs at most one extra fit pass rather than clipping content or padding the image with
  // dead white space.
  const [width, setWidth] = useState(0)
  // The measurement is tagged with the job it belongs to. Without the tag, the capture effect
  // re-runs the instant a new job arrives — still holding the previous job's height, because the
  // reset below only applies on the next render — and fires a capture against a view that has not
  // laid out yet.
  const [measured, setMeasured] = useState<{ jobId: number; height: number } | null>(null)
  const fitPassRef = useRef(0)

  const measuredHeight = job && measured?.jobId === job.id ? measured.height : null

  // Keyed on the job alone. Including availableWidth/availableHeight here meant a late safe-area
  // update — routine when a Modal presents — would blank measuredHeight after the artifact had
  // already laid out, and if the recomputed width came out identical, no new layout event would
  // ever arrive to replace it.
  useEffect(() => {
    if (!job) return
    fitPassRef.current = 0
    setMeasured(null)
    setWidth(estimateFitWidth(job.spec, availableWidth, availableHeight))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id])

  // Watchdog: armed with each job, disarmed as soon as the artifact reports a usable height.
  useEffect(() => {
    if (!job || measuredHeight !== null) return
    const timer = setTimeout(() => {
      job.reject(new Error('The export never finished laying out. This is a bug in its template.'))
      clear(job.id)
    }, LAYOUT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [job, measuredHeight, clear])

  const jobId = job?.id
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height
      if (height <= 0 || jobId === undefined) return

      // Real height overshot the screen — shrink by the exact ratio and let it lay out again
      // rather than capturing a view that runs off the bottom.
      if (height > availableHeight && fitPassRef.current < MAX_FIT_PASSES) {
        fitPassRef.current += 1
        setMeasured(null)
        setWidth((current) => current * (availableHeight / height))
        return
      }

      setMeasured({ jobId, height })
    },
    [availableHeight, jobId]
  )

  useEffect(() => {
    if (!job || measuredHeight === null || width <= 0) return
    let abandoned = false

    void (async () => {
      try {
        await waitFrames(PAINT_SETTLE_FRAMES)
        await delay(PAINT_SETTLE_MS)
        if (abandoned) return

        const result = await captureView(captureTargetRef, {
          layoutWidthPt: width,
          layoutHeightPt: measuredHeight,
          format: job.spec.format,
          quality: job.spec.quality,
          encoding: job.spec.encoding,
        })
        if (abandoned) return
        job.resolve(result)
      } catch (error) {
        if (!abandoned) job.reject(error)
      } finally {
        if (!abandoned) clear(job.id)
      }
    })()

    return () => {
      abandoned = true
    }
  }, [job, measuredHeight, width, clear])

  return (
    // onRequestClose is Android's back gesture. It used to be a no-op, which trapped the coach
    // inside a long multi-page session export with no way out.
    <Modal visible={job !== null} animationType="fade" transparent={false} statusBarTranslucent onRequestClose={cancel}>
      <View style={styles.root}>
        {job && width > 0 ? (
          // Width is fixed, height is left to content and then measured — see measuredHeight.
          // collapsable={false} is required: without it Android flattens this away and there is
          // no native view left to capture.
          // key={job.id} is load-bearing. onLayout only fires when a view's layout CHANGES, and
          // consecutive jobs are frequently identical in size — every session page is exactly
          // 360x640 — so without a fresh mount per job the second page and everything after it
          // would re-render at the same size, never report a layout, and hang until the
          // watchdog fired.
          <View
            key={job.id}
            collapsable={false}
            ref={captureTargetRef}
            style={{ width }}
            onLayout={handleLayout}
          >
            {job.spec.render(width)}
          </View>
        ) : null}

        <View style={styles.scrim}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.status}>{status ?? 'Preparing export…'}</Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Fully opaque on purpose — a translucent scrim would show the artifact being built.
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  status: {
    ...typography.callout,
    color: colors.textSecondary,
  },
})
