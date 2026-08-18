import * as Sharing from 'expo-sharing'

export type ShareKind = 'png' | 'pdf'

// iOS wants a UTI (without it the activity sheet offers a poorer set of destinations); Android
// wants a MIME type for its FileProvider grant. Pass both — each platform ignores the other's.
const SHARE_TYPES: Record<ShareKind, { UTI: string; mimeType: string }> = {
  png: { UTI: 'public.png', mimeType: 'image/png' },
  pdf: { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' },
}

export class SharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device')
    this.name = 'SharingUnavailableError'
  }
}

/**
 * Hands a finished artifact to the native share sheet.
 *
 * Resolving means the sheet was presented and dismissed — NOT that anything was sent. Neither
 * platform reports the chosen destination or a cancel, so callers must never show a success
 * confirmation off the back of this.
 */
export async function shareFile(uri: string, kind: ShareKind, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new SharingUnavailableError()
  await Sharing.shareAsync(uri, { ...SHARE_TYPES[kind], dialogTitle })
}
