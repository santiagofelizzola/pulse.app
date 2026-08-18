import * as Print from 'expo-print'

// A session PDF page, phone-shaped rather than paper-shaped.
//
// A4 (595x842pt) fit to a phone screen renders 15pt body text at about 7pt effective — unreadable
// without zooming, and these are read on a phone far more often than they are printed. A 9:16
// page fills the screen edge to edge in any PDF viewer at fit-width, so type reads at its true
// size. It also fits within every phone's screen, which the capture pipeline requires.
export const SESSION_PAGE = { width: 360, height: 640 } as const

/**
 * Wraps page images into a PDF.
 *
 * Every page is a single full-bleed IMAGE rendered by React Native, not HTML. That is the whole
 * trick, and it removes four problems at once:
 *
 *  - Page breaks cannot land mid-content, because a page is one indivisible image.
 *  - Poppins needs no @font-face embed (~850KB of base64 for four weights, per export); the text
 *    is rasterized by RN in the real font.
 *  - Typography is identical to the app, because it IS the app's components.
 *  - None of expo-print's unreliable CSS surface is involved: no `@page` rules (ignored — page
 *    size comes from the width/height arguments), no `page-break-inside: avoid` (unreliable in
 *    WebKit), no `vh` units (they resolve against the viewport, not the page box, during iOS
 *    pagination). Every dimension below is explicit px matching the page arguments.
 *
 * The trade is that PDF text is not selectable or searchable. For a session plan read on a phone
 * that is worth it.
 */
export async function buildPdfFromPageImages(pageDataUris: string[]): Promise<string> {
  const { width, height } = SESSION_PAGE

  const pages = pageDataUris
    .map((uri, index) => {
      const last = index === pageDataUris.length - 1
      return `<div class="page${last ? ' last' : ''}"><img src="${uri}" /></div>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=${width}" /></head>
  <body>
    <style>
      html, body { margin: 0; padding: 0; background: #FFFFFF; }
      .page {
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
      /* One pixel shorter on the final page only.
       *
       * expo-print's Android renderer counts pages as 1 + floor(contentHeight / pageHeight)
       * (PrintPDFRenderTask.kt). Content that is an EXACT multiple of the page height — which N
       * pages of exactly ${height}px is — therefore yields N+1, and the document ends with a
       * blank page. Coming up a pixel short makes the division land on N. Invisible either way,
       * and harmless on iOS, which paginates through WKWebView instead. */
      .page.last { height: ${height - 1}px; }
      .page img { display: block; width: ${width}px; height: ${height}px; }
      .page.last img { height: ${height - 1}px; }
    </style>
    ${pages}
  </body>
</html>`

  const { uri } = await Print.printToFileAsync({ html, width, height, base64: false })
  return uri
}
