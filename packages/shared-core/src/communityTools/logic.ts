import type {
  CommunityTag,
  CommunityTool,
  FeedWindow,
  Lifecycle,
  MatchField,
} from './types'

/** A topic the way the next person will type it: `Plate Maps` is `plate-maps`. */
export function normalizeTopic(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-')
}

/** Topics normalised, then each tag once: two spellings of a topic are one tag. */
export function normalizeTags(tags: CommunityTag[]): CommunityTag[] {
  const seen = new Set<string>()
  const out: CommunityTag[] = []
  for (const tag of tags) {
    const value = tag.kind === 'topic' ? normalizeTopic(tag.value) : tag.value
    const key = `${tag.kind}:${value}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ kind: tag.kind, value })
  }
  return out
}

export function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.hostname.toLowerCase()
  } catch {
    return null
  }
}

export function isCaptureAllowed(url: string, suffixes: string[]): boolean {
  const host = hostOf(url)
  if (!host) return false

  // Reject IP literals
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false
  if (/^[0-9a-f:]+$/i.test(host)) return false // IPv6

  // Reject localhost
  if (host === 'localhost') return false

  // Only the default port: `URL` normalises :80/:443 away, so any port left is explicit
  if (new URL(url).port !== '') return false

  // Check if host equals a suffix or ends with .suffix
  return suffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  )
}

export function matchTool(
  tool: CommunityTool,
  query: string,
  appNames: Record<string, string>,
): { matched: boolean; fields: MatchField[]; strength: number } {
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((t) => t.toLowerCase())

  if (tokens.length === 0 || tokens[0] === '') {
    return { matched: true, fields: [], strength: 0 }
  }

  // Build searchable text for each field
  const canonicalOrder: MatchField[] = [
    'name',
    'summary',
    'description',
    'owner',
    'address',
    'tag',
  ]

  const fieldTexts: Record<MatchField, string> = {
    name: tool.name.toLowerCase(),
    summary: tool.summary.toLowerCase(),
    description: tool.descriptionMd.toLowerCase(),
    owner: tool.owners.map((o) => o.name.toLowerCase()).join(' '),
    address: tool.url.toLowerCase(),
    tag: tool.tags
      .map((t) => {
        if (t.kind === 'app') {
          const appName = appNames[t.value]
          return `${t.value} ${appName || ''}`.toLowerCase()
        }
        return t.value.toLowerCase()
      })
      .join(' '),
  }

  const matchedFields: MatchField[] = []
  let strength = 0

  // For each token, find the first field (in canonical order) that matches
  for (const token of tokens) {
    let tokenMatched = false
    for (const fieldName of canonicalOrder) {
      const fieldText = fieldTexts[fieldName]
      if (fieldText.includes(token)) {
        matchedFields.push(fieldName)
        strength += FIELD_TIER[fieldName]
        tokenMatched = true
        break // Only record the first matching field for this token
      }
    }
    if (!tokenMatched) {
      return { matched: false, fields: [], strength: 0 }
    }
  }

  // Deduplicate while preserving order, then re-sort by canonical order
  const uniqueFields = Array.from(new Set(matchedFields))
  const sorted = canonicalOrder.filter((f) => uniqueFields.includes(f))

  return { matched: true, fields: sorted, strength }
}

/**
 * How strongly a hit in each field says "this is the tool": its name, then
 * what it says about itself, then who made it, its tags and its address.
 * Lower is stronger.
 */
const FIELD_TIER: Record<MatchField, number> = {
  name: 0,
  summary: 1,
  description: 1,
  owner: 2,
  tag: 2,
  address: 2,
}

/**
 * The search results for `query`: live tools by match strength (the sum of
 * each word's best field), ties in the feed's own order, then archived ones,
 * greyed, by name. Archived tools leave the feed, but searching still finds
 * them.
 */
export function searchTools(
  tools: CommunityTool[],
  query: string,
  appNames: Record<string, string>,
  window: FeedWindow,
): { tool: CommunityTool; fields: MatchField[] }[] {
  const hits = new Map<string, { fields: MatchField[]; strength: number }>()
  for (const tool of tools) {
    const match = matchTool(tool, query, appNames)
    if (match.matched) hits.set(tool.slug, match)
  }
  const hit = tools.filter((t) => hits.has(t.slug))
  const strengthOf = (t: CommunityTool) => hits.get(t.slug)!.strength
  // Array.sort is stable: equal strength keeps rankTools' order.
  const live = rankTools(hit, window).sort(
    (a, b) => strengthOf(a) - strengthOf(b),
  )
  const archived = hit
    .filter((t) => t.lifecycle.state === 'archived')
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...live, ...archived].map((tool) => ({
    tool,
    fields: hits.get(tool.slug)!.fields,
  }))
}

export function rankTools(
  tools: CommunityTool[],
  window: FeedWindow,
): CommunityTool[] {
  // Filter out archived tools
  const active = tools.filter((t) => t.lifecycle.state !== 'archived')

  // Partition into working and not-working
  const working = active.filter((t) => t.lifecycle.state !== 'not-working')
  const notWorking = active.filter((t) => t.lifecycle.state === 'not-working')

  // Sort each partition
  const sortFn = (a: CommunityTool, b: CommunityTool): number => {
    let valueA: number | string
    let valueB: number | string

    if (window === 'month') {
      valueA = a.views30d
      valueB = b.views30d
    } else if (window === 'all') {
      valueA = a.viewsAll
      valueB = b.viewsAll
    } else {
      // newest
      valueA = a.createdAt
      valueB = b.createdAt
    }

    // Sort desc for views, desc for dates (newest first)
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      if (valueB !== valueA) return valueB - valueA
    } else if (typeof valueA === 'string' && typeof valueB === 'string') {
      if (valueB !== valueA) return valueB.localeCompare(valueA)
    }

    // Tie-breaker: name ascending
    return a.name.localeCompare(b.name)
  }

  const sortedWorking = working.sort(sortFn)
  const sortedNotWorking = notWorking.sort(sortFn)

  return [...sortedWorking, ...sortedNotWorking]
}

interface LifecycleFields {
  failingSince: Date | null
  archivedAt: Date | null
  archivedBy: string | null
}

export function nextLifecycle(
  t: LifecycleFields,
  ok: boolean,
  now: Date,
): Partial<LifecycleFields & { archivedReason?: string }> {
  // Person archive sticks
  if (t.archivedAt && t.archivedBy && t.archivedBy !== 'auto') {
    return {}
  }

  if (ok) {
    // Success: clear auto-archive or failing streak
    if (t.archivedAt && t.archivedBy === 'auto') {
      return {
        failingSince: null,
        archivedAt: null,
        archivedBy: null,
      }
    }
    if (t.failingSince && !t.archivedAt) {
      return { failingSince: null }
    }
    return {}
  } else {
    // Failure
    if (!t.failingSince && !t.archivedAt) {
      // First failure
      return { failingSince: now }
    }

    if (t.failingSince && !t.archivedAt) {
      // Check if 30 days have passed
      const daysSinceFailing = Math.floor(
        (now.getTime() - t.failingSince.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysSinceFailing >= 30) {
        return {
          archivedAt: now,
          archivedBy: 'auto',
          archivedReason: 'Failed availability checks for 30 days',
        }
      }
    }

    return {}
  }
}

export function lifecycleOf(
  t: LifecycleFields & { archivedReason: string | null },
  now: Date,
): Lifecycle {
  if (t.archivedAt) {
    const by = t.archivedBy === 'auto' ? 'auto' : 'person'
    return {
      state: 'archived',
      by,
      reason: t.archivedReason,
      at: t.archivedAt.toISOString(),
      byName: by === 'auto' ? null : t.archivedBy,
    }
  }

  if (t.failingSince) {
    // Whole days since the streak began; a streak started today is day 1.
    const daysFailing = Math.max(
      1,
      Math.floor(
        (now.getTime() - t.failingSince.getTime()) / (1000 * 60 * 60 * 24),
      ),
    )
    return {
      state: 'not-working',
      days: daysFailing,
    }
  }

  return { state: 'active' }
}
