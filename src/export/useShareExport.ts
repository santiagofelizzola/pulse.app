import { useCallback, useState } from 'react'
import { Alert } from 'react-native'

import { exportErrorMessage } from './errors'
import { isSharingUnavailable } from '../utils/exportUtils'

// Time to let one Modal finish dismissing before another is presented.
//
// ExportSheet is a Modal and ExportRenderHost presents another; iOS quietly refuses to present
// over a live modal, which would leave the host mounted but never laid out and the export
// hanging. Both editors are themselves fullScreenModal screens, so on those surfaces this is a
// third level of presentation and the ordering matters even more.
const MODAL_DISMISS_MS = 300

/**
 * The shared "share button" behaviour: close the sheet, let it go, run the export, and report a
 * failure as an Alert naming the stage that broke.
 *
 * One hook rather than three copies so the activity, canvas and lineup entry points cannot drift
 * apart on the modal ordering — the part that is easy to get subtly wrong.
 */
export function useShareExport() {
  const [busy, setBusy] = useState(false)

  const share = useCallback(async (closeSheet: () => void, run: () => Promise<unknown>) => {
    closeSheet()
    setBusy(true)
    await new Promise((resolve) => setTimeout(resolve, MODAL_DISMISS_MS))

    try {
      await run()
      // Deliberately no success message: the share sheet resolving tells us nothing about
      // whether the coach actually sent anything (see share.ts).
    } catch (error) {
      const message = isSharingUnavailable(error)
        ? "Sharing isn't available on this device."
        : exportErrorMessage(error)
      Alert.alert('Could not export', message)
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, share }
}
