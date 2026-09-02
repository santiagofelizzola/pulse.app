import type { SessionUsage } from '../types'

// How many sessions get named before the list collapses to a count. Three covers the realistic
// case — a drill sits in one or two sessions — while keeping the alert readable at a glance. Past
// that the names stop being actionable, since the coach has to open each session either way, and
// the count is the fact that actually informs the decision.
const MAX_NAMED_SESSIONS = 3

// Session and activity names are free text with no length limit anywhere, so one long title would
// otherwise crowd out everything after it.
const MAX_NAME_LENGTH = 30

function truncate(name: string): string {
  return name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH - 1).trimEnd()}…` : name
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// Explains why an activity can't be deleted yet. Up to MAX_NAMED_SESSIONS sessions are named;
// beyond that the count leads, because that's the part that changes what the coach does next.
export function activityInUseMessage(activityName: string, usedBy: SessionUsage[]): string {
  const name = truncate(activityName)
  const named = usedBy.slice(0, MAX_NAMED_SESSIONS).map((session) => `"${truncate(session.name)}"`)

  if (usedBy.length === 1) {
    return `"${name}" is used in ${named[0]}. Remove it from that session before deleting it.`
  }
  if (usedBy.length <= MAX_NAMED_SESSIONS) {
    return `"${name}" is used in ${joinNames(named)}. Remove it from those sessions before deleting it.`
  }
  return `"${name}" is used in ${usedBy.length} sessions, including ${joinNames(named)}. Remove it from them before deleting it.`
}
