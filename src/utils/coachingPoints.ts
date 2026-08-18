// Coaching points are stored as one freeform string (SessionActivity.coachingPoints) with one
// point per line — see CoachingPointsEditor. Everything that displays them has to agree on that,
// so the split lives here rather than being re-derived per surface. The export's page-height
// budget depends on the count being exactly right: an undercount does not compress the layout
// (React Native's flexShrink defaults to 0), it pushes text through the page footer.
export function coachingPointLines(value: string | undefined | null): string[] {
  if (!value) return []
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * How many rendered lines a list of points occupies, allowing for long points wrapping, and the
 * subset that fits within `maxLines`.
 *
 * Returned together so a caller measuring the block and a caller rendering it cannot disagree
 * about where the truncation falls.
 */
export function fitCoachingPoints(
  points: string[],
  charsPerLine: number,
  maxLines: number
): { visible: string[]; lines: number } {
  const visible: string[] = []
  let lines = 0

  for (const point of points) {
    const wrapped = Math.max(1, Math.ceil(point.length / charsPerLine))
    if (lines + wrapped > maxLines) break
    visible.push(point)
    lines += wrapped
  }

  // Always show something if there is anything to show, even a single over-long point.
  if (visible.length === 0 && points.length > 0) {
    visible.push(points[0])
    lines = maxLines
  }

  return { visible, lines }
}
