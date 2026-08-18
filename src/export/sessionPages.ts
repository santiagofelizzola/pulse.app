import { spacing } from '../theme/theme'
import type { SessionActivity } from '../types'
import { SESSION_PAGE } from './pdf'
import type { ExportDetail } from './types'

// Page geometry shared by the pagination maths here and the layout in SessionPage. Kept in one
// place because "how many cards fit" and "how tall is a card" have to agree exactly.
export const SESSION_PAGE_PADDING = spacing.xl
// Hairline rule + its padding + one line of caption text.
export const SESSION_PAGE_FOOTER_HEIGHT = 27
export const SESSION_PAGE_BODY_HEIGHT =
  SESSION_PAGE.height - SESSION_PAGE_PADDING * 2 - SESSION_PAGE_FOOTER_HEIGHT

export const OVERVIEW_CARD_GAP = spacing.md
// Below this a card is too short for a name, a block tag and a legible diagram. It is the floor
// that decides when an overview finally has to spill onto a second page.
export const OVERVIEW_MIN_CARD_HEIGHT = 56
// And a ceiling, so a one- or two-activity session does not stretch each card to a third of a
// page around a small diagram. Past this the page simply ends early, which reads as a short
// session rather than as a layout fault.
export const OVERVIEW_MAX_CARD_HEIGHT = 200

/** Cards share the page's body height evenly, so an overview fills its page without stretching. */
export function overviewCardHeight(count: number): number {
  const even = (SESSION_PAGE_BODY_HEIGHT - (count - 1) * OVERVIEW_CARD_GAP) / Math.max(count, 1)
  return Math.min(even, OVERVIEW_MAX_CARD_HEIGHT)
}

// Hard ceiling on activities per overview page — the same six that architecture.md and scope.md
// have always specified. Geometry alone would allow eight, but six is the product decision and it
// wins.
const OVERVIEW_HARD_MAX_PER_PAGE = 6

// The floor the page geometry can actually carry, kept alongside the hard max so a future change
// to page size or card metrics tightens the limit automatically rather than silently producing
// unreadable cards.
const OVERVIEW_GEOMETRIC_MAX_PER_PAGE = Math.max(
  1,
  Math.floor((SESSION_PAGE_BODY_HEIGHT + OVERVIEW_CARD_GAP) / (OVERVIEW_MIN_CARD_HEIGHT + OVERVIEW_CARD_GAP))
)

// The whole point of the overview is that a coach sees the session's shape in one look, so it
// packs as many activities onto a page as both limits allow. A typical session of three to six
// activities lands on a single page.
export const OVERVIEW_MAX_PER_PAGE = Math.min(OVERVIEW_HARD_MAX_PER_PAGE, OVERVIEW_GEOMETRIC_MAX_PER_PAGE)

// Overview honours the docs' six-per-page rule; Full plan gives every drill its own page, since a
// diagram shrunk to share one is not worth coaching from.
export const ACTIVITIES_PER_PAGE: Record<ExportDetail, number> = {
  simple: OVERVIEW_MAX_PER_PAGE,
  full: 1,
}

// Beyond this an export is almost certainly a mistake, and each page costs a full capture. Warn
// well before the hard stop so a long-but-real session still gets through.
export const SESSION_WARN_ACTIVITIES = 20
export const SESSION_MAX_ACTIVITIES = 40

export type SessionPage =
  | { kind: 'cover' }
  | { kind: 'detail'; block: SessionActivity }
  | { kind: 'overview'; blocks: SessionActivity[] }

/**
 * Splits into as few pages as possible, then spreads evenly across them.
 *
 * Even distribution matters: 10 activities at a capacity of 8 would otherwise give a packed page
 * of 8 followed by a nearly empty one of 2, whose two cards would stretch to half a page each.
 * 5 and 5 reads as one document.
 */
function paginate<T>(items: T[], capacity: number): T[][] {
  if (items.length === 0) return []
  const pageCount = Math.ceil(items.length / capacity)
  const perPage = Math.ceil(items.length / pageCount)
  const out: T[][] = []
  for (let i = 0; i < items.length; i += perPage) out.push(items.slice(i, i + perPage))
  return out
}

export function buildSessionPages(blocks: SessionActivity[], detail: ExportDetail): SessionPage[] {
  if (detail === 'full') {
    return [{ kind: 'cover' as const }, ...blocks.map((block) => ({ kind: 'detail' as const, block }))]
  }
  return paginate(blocks, OVERVIEW_MAX_PER_PAGE).map((group) => ({ kind: 'overview' as const, blocks: group }))
}
