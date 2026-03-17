import type { AppForCatalog } from '@igstack/app-catalog-backend-core'

export interface SearchMatch {
  /** Field where the match occurred */
  field: 'displayName' | 'alias' | 'slug' | 'tags' | 'teams' | 'description'
  /** Type of match */
  type: 'exact' | 'prefix' | 'contains'
}

export interface SearchResult {
  app: AppForCatalog
  match: SearchMatch
}

/**
 * Search and sort apps by relevance with highlighting support.
 * Priority order:
 * 1. Exact matches in displayName or alias
 * 2. Prefix matches in displayName or alias
 * 3. Contains matches in displayName or alias
 * 4. Tags
 * 5. Teams
 * 6. Description
 *
 * @param apps - Array of apps to search
 * @param searchQuery - Search query string
 * @returns Filtered and sorted array of apps with search results
 */
export function searchApps(
  apps: Array<AppForCatalog>,
  searchQuery: string,
): Array<AppForCatalog> {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  if (normalizedQuery === '') {
    return apps
  }

  // Filter and score apps
  const scoredApps = apps
    .map((app): SearchResult | null => {
      const name = app.displayName.toLowerCase()
      const alias = app.alias?.toLowerCase() || ''
      const description = app.description?.toLowerCase() || ''
      const tags = app.tags?.join(' ').toLowerCase() || ''
      const teams = app.teams?.join(' ').toLowerCase() || ''

      // Check exact matches first
      if (name === normalizedQuery) {
        return { app, match: { field: 'displayName', type: 'exact' } }
      }
      if (alias && alias === normalizedQuery) {
        return { app, match: { field: 'alias', type: 'exact' } }
      }

      // Check prefix matches
      if (name.startsWith(normalizedQuery)) {
        return { app, match: { field: 'displayName', type: 'prefix' } }
      }
      if (alias && alias.startsWith(normalizedQuery)) {
        return { app, match: { field: 'alias', type: 'prefix' } }
      }

      // Check contains matches in name/alias
      if (name.includes(normalizedQuery)) {
        return { app, match: { field: 'displayName', type: 'contains' } }
      }
      if (alias && alias.includes(normalizedQuery)) {
        return { app, match: { field: 'alias', type: 'contains' } }
      }

      // Check tags
      if (tags.includes(normalizedQuery)) {
        return { app, match: { field: 'tags', type: 'contains' } }
      }

      // Check teams
      if (teams.includes(normalizedQuery)) {
        return { app, match: { field: 'teams', type: 'contains' } }
      }

      // Check description
      if (description.includes(normalizedQuery)) {
        return { app, match: { field: 'description', type: 'contains' } }
      }

      // No match found
      return null
    })
    .filter((item): item is SearchResult => item !== null)

  // Calculate numeric scores for sorting
  const scoreMap = new Map<string, number>()
  scoredApps.forEach(({ app, match }) => {
    let score = 0

    // Exact matches: 0-1
    if (match.type === 'exact') {
      score = match.field === 'displayName' ? 0 : 1
    }
    // Prefix matches: 2-3
    else if (match.type === 'prefix') {
      score = match.field === 'displayName' ? 2 : 3
    }
    // Contains in name/alias: 4-5
    else if (match.field === 'displayName' || match.field === 'alias') {
      score = match.field === 'displayName' ? 4 : 5
    }
    // Tags: 6
    else if (match.field === 'tags') {
      score = 6
    }
    // Teams: 7
    else if (match.field === 'teams') {
      score = 7
    }
    // Description: 8
    else {
      score = 8
    }

    scoreMap.set(app.id, score)
  })

  // Sort by score (ascending - lower score = higher priority)
  scoredApps.sort((a, b) => {
    const scoreA = scoreMap.get(a.app.id) ?? 999
    const scoreB = scoreMap.get(b.app.id) ?? 999

    if (scoreA !== scoreB) {
      return scoreA - scoreB
    }
    // If same score, sort alphabetically by display name
    return a.app.displayName.localeCompare(b.app.displayName)
  })

  return scoredApps.map((item) => item.app)
}

/**
 * Highlight matching text in a string
 * @param text - Text to highlight
 * @param query - Search query
 * @returns Array of text segments with highlight flags
 */
export function highlightText(
  text: string,
  query: string,
): Array<{ text: string; highlight: boolean }> {
  if (!query.trim()) {
    return [{ text, highlight: false }]
  }

  const normalizedQuery = query.trim().toLowerCase()
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(normalizedQuery)

  if (index === -1) {
    return [{ text, highlight: false }]
  }

  const segments: Array<{ text: string; highlight: boolean }> = []

  // Text before match
  if (index > 0) {
    segments.push({ text: text.slice(0, index), highlight: false })
  }

  // Matched text
  segments.push({
    text: text.slice(index, index + normalizedQuery.length),
    highlight: true,
  })

  // Text after match
  if (index + normalizedQuery.length < text.length) {
    segments.push({
      text: text.slice(index + normalizedQuery.length),
      highlight: false,
    })
  }

  return segments
}
