import { isKeeperPosition, normalizeRole } from './formationSlots'
import type { LineupPosition } from '../types'

// The traditional 1–11, expressed as a POOL per role rather than a single number, because a
// formation's generic labels repeat: a back four is FB/CB/CB/FB, and 4-4-2 fields two STs. Each
// role's pool is drawn in x-descending order, so the player further right on screen takes the
// smaller number — right back 2, left back 3; right centre back 4, left 5; right winger 7, left 11.
//
// Order matters: roles with exactly one conventional number claim it before the multi-entry pools
// get a chance to spend it, and CM goes last because its pool is the one that overlaps everything
// (a lone CM wants 8; a midfield three spreads over 6/8/10, which the coach then adjusts).
const ROLE_POOLS: Array<{ role: string; pool: number[] }> = [
  { role: 'CDM', pool: [6] },
  { role: 'CAM', pool: [10] },
  { role: 'FB', pool: [2, 3] },
  { role: 'CB', pool: [4, 5] },
  { role: 'W', pool: [7, 11] },
  { role: 'ST', pool: [9, 10] },
  { role: 'CM', pool: [8, 6, 10] },
]

const KEEPER_NUMBER = 1

// Right-to-left across the pitch — the ordering the pools are handed out in.
function byXDescending(a: LineupPosition, b: LineupPosition): number {
  return b.x - a.x
}

// Back to front (y=1 is the team's own goal), then right to left within a line — the reading order
// shirt numbers conventionally follow, used only for the leftovers the role pools couldn't place.
function byDepthThenX(a: LineupPosition, b: LineupPosition): number {
  return b.y - a.y || b.x - a.x
}

/**
 * Fills in a shirt number for every position that doesn't already have one, leaving existing
 * numbers — auto-assigned earlier or overridden by the coach — untouched. Best-effort by design:
 * formation roles are generic labels (a "CB" may be a sweeper, a "W" an inverted one), so this is
 * a sensible starting XI numbering that the coach corrects per player, not a claim about the
 * team's actual squad numbers.
 */
export function assignShirtNumbers(positions: LineupPosition[]): LineupPosition[] {
  const assigned = new Map<string, number>()
  // Seeded with the numbers already in use, so auto-assignment never duplicates one the coach set
  // by hand — an override of 7 pushes the winger who would have had it onto the next free number.
  const taken = new Set<number>(
    positions.map((position) => position.shirtNumber).filter((value): value is number => value != null)
  )

  const claim = (position: LineupPosition, value: number) => {
    assigned.set(position.id, value)
    taken.add(value)
  }

  const isUnassigned = (position: LineupPosition) =>
    position.shirtNumber == null && !assigned.has(position.id)

  // The keeper is matched on isKeeperPosition rather than a 'GK' role string: the 'custom'
  // formation strips every role but preserves isKeeper, so role matching alone would miss it.
  positions.filter((position) => isUnassigned(position) && isKeeperPosition(position)).forEach((keeper) => {
    if (!taken.has(KEEPER_NUMBER)) claim(keeper, KEEPER_NUMBER)
  })

  ROLE_POOLS.forEach(({ role, pool }) => {
    positions
      .filter((position) => isUnassigned(position) && normalizeRole(position.role) === role)
      .sort(byXDescending)
      .forEach((position) => {
        const value = pool.find((candidate) => !taken.has(candidate))
        // No pool entry left (an unusually deep line, or an override ate them) — the sweep below
        // picks this position up rather than forcing a duplicate.
        if (value != null) claim(position, value)
      })
  })

  // Everything the pools couldn't place: unrecognized or coach-renamed roles, drained pools, and
  // — the common case — every outfield player of a 'custom' lineup, whose roles are all stripped.
  // Without this sweep those markers would render blank in number mode.
  let next = 1
  positions
    .filter(isUnassigned)
    .sort(byDepthThenX)
    .forEach((position) => {
      while (taken.has(next)) next += 1
      claim(position, next)
    })

  return positions.map((position) => {
    const value = assigned.get(position.id)
    return value != null ? { ...position, shirtNumber: value } : position
  })
}
