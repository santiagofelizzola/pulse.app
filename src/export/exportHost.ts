import type { ReactNode } from 'react'
import { create } from 'zustand'

import type { CaptureResult } from './capture'

// What the host needs in order to render and capture something, with no idea what subject it
// is. Phase 2's lineup and phase 3's session pages are new callers of renderAndCapture, not new
// branches inside the host.
export interface RenderSpec {
  // Laid-out height in points for a candidate width. Used to fit the artifact inside the screen
  // before rendering, because a capture target taller than the screen is the blank-image failure
  // mode described in capture.ts.
  measure: (width: number) => number
  render: (width: number) => ReactNode
  format?: 'png' | 'jpg'
  quality?: number
}

interface RenderJob {
  id: number
  spec: RenderSpec
  resolve: (result: CaptureResult) => void
  reject: (error: unknown) => void
}

interface ExportHostState {
  job: RenderJob | null
  // The line shown under the spinner. Single-capture exports barely show it; a paginated session
  // drives it per page ("Rendering page 3 of 7").
  status: string | null
  enqueue: (job: RenderJob) => void
  clear: (id: number) => void
  setStatus: (status: string | null) => void
}

export const useExportHostStore = create<ExportHostState>((set, get) => ({
  job: null,
  status: null,
  enqueue: (job) => set({ job }),
  // Guarded by id so a late clear from an abandoned job can't wipe a newer one.
  clear: (id) => {
    if (get().job?.id === id) set({ job: null })
  },
  setStatus: (status) => set({ status }),
}))

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
