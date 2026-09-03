import type { ReactNode } from 'react'
import { create } from 'zustand'

import { ExportCancelledError } from './errors'
import type { CaptureResult } from './capture'

// What the host needs in order to render and capture something, with no idea what subject it
// is. Phase 2's lineup and phase 3's session pages are new callers of renderAndCapture, not new
// branches inside the host.
export interface RenderSpec {
  // Laid-out height in points for a candidate width. Artifacts are a fixed 9:16, so this is
  // simply width * ARTIFACT_ASPECT — the host uses it to pick a width whose height still fits
  // the screen, since a capture target taller than the screen is the blank-image failure mode
  // described in capture.ts.
  //
  // Templates absorb a tight frame by shrinking their DIAGRAM, never the artifact: narrowing the
  // artifact would trade away pixel width and text legibility to buy pitch height, which is
  // backwards.
  measure: (width: number) => number
  render: (width: number) => ReactNode
  format?: 'png' | 'jpg'
  quality?: number
  encoding?: 'file' | 'data-uri'
  // Forces a specific layout width instead of the host's "as wide as the pixel ceiling and the
  // screen allow" default. Session pages are designed at a fixed 360pt page size, so rendering
  // them at an arbitrary device width would leave a blank strip beside the page in the capture.
  // Still clamped to the screen.
  fixedWidth?: number
}

interface RenderJob {
  id: number
  spec: RenderSpec
  resolve: (result: CaptureResult) => void
  reject: (error: unknown) => void
}

interface ExportHostState {
  job: RenderJob | null
  // Whether an export RUN is in progress, as opposed to a single capture.
  //
  // `job` is the wrong unit for the host's lifetime: it is per-CAPTURE, and a session export
  // churns it once per page. Driving the overlay from `job` made it mount and unmount repeatedly
  // inside one export. The run is what the coach experiences, so the run is what the overlay
  // follows — one show, one hide.
  running: boolean
  // The line shown under the spinner. Single-capture exports barely show it; a paginated session
  // drives it per page ("Rendering page 3 of 7").
  status: string | null
  enqueue: (job: RenderJob) => void
  clear: (id: number) => void
  setStatus: (status: string | null) => void
  setRunning: (running: boolean) => void
  cancel: () => void
}

export const useExportHostStore = create<ExportHostState>((set, get) => ({
  job: null,
  running: false,
  status: null,
  // Rejects whatever it displaces. Overwriting the slot silently used to strand the previous
  // job's promise forever — nothing would ever resolve or reject it — so a double-tapped Share
  // left the coach on a spinner with no error.
  enqueue: (job) => {
    const current = get().job
    if (current) current.reject(new ExportCancelledError())
    set({ job })
  },
  // Guarded by id so a late clear from an abandoned job can't wipe a newer one. Clearing a job
  // no longer takes the overlay down — `running` decides that.
  clear: (id) => {
    if (get().job?.id === id) set({ job: null })
  },
  setStatus: (status) => set({ status }),
  setRunning: (running) => set({ running }),

  // Backing out of an in-flight export (Android's back gesture over the render host). The job
  // rejects with ExportCancelledError, which callers treat as "say nothing" rather than an error.
  cancel: () => {
    const current = get().job
    if (!current) return
    current.reject(new ExportCancelledError())
    set({ job: null, status: null, running: false })
  },
}))

/**
 * Marks the boundaries of an export RUN, which is what the host overlay follows.
 *
 * `endExportRun` is called before the share sheet opens, not in a `finally` after it: nothing of
 * ours should be on screen behind the OS share sheet. It is idempotent, so the `finally` can call
 * it again to cover the failure paths.
 */
export function beginExportRun(): void {
  useExportHostStore.getState().setRunning(true)
}

export function endExportRun(): void {
  if (useExportHostStore.getState().running) useExportHostStore.getState().setRunning(false)
}

let nextJobId = 1

/**
 * Renders `spec` inside the export host and resolves with the captured image.
 *
 * Serial by construction: each call replaces the host's single job slot, and every caller awaits
 * its result before enqueuing the next. That is what bounds memory on a multi-diagram session —
 * one full-size bitmap alive at a time, released before the next render mounts.
 */
export function renderAndCapture(spec: RenderSpec): Promise<CaptureResult> {
  return new Promise<CaptureResult>((resolve, reject) => {
    useExportHostStore.getState().enqueue({ id: nextJobId++, spec, resolve, reject })
  })
}

export function setExportStatus(status: string | null): void {
  useExportHostStore.getState().setStatus(status)
}
