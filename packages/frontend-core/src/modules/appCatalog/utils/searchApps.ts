import type { AppForCatalog } from '@igstack/app-catalog-backend-core'

/**
 * Search and sort apps by relevance.
 * Prioritizes prefix matches in display name over other matches.
 *
 * @param apps - Array of apps to search
 * @param searchQuery - Search query string
 * @returns Filtered and sorted array of apps
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
    .map((app) => {
      const name = app.displayName.toLowerCase()
      const slug = app.slug.toLowerCase()
      const description = app.description?.toLowerCase() || ''
      const tags = app.tags?.join(' ').toLowerCase() || ''

      // Check if any field matches
      const nameMatch = name.includes(normalizedQuery)
      const slugMatch = slug.includes(normalizedQuery)
      const descriptionMatch = description.includes(normalizedQuery)
      const tagsMatch = tags.includes(normalizedQuery)

      if (!nameMatch && !slugMatch && !descriptionMatch && !tagsMatch) {
        return null
      }

      // Calculate score (lower is better)
      let score = 0

      // Highest priority: prefix match in display name
      if (name.startsWith(normalizedQuery)) {
        score = 0
      }
      // Second priority: prefix match in slug
      else if (slug.startsWith(normalizedQuery)) {
        score = 1
      }
      // Third priority: anywhere in display name
      else if (nameMatch) {
        score = 2
      }
      // Fourth priority: anywhere in slug
      else if (slugMatch) {
        score = 3
      }
      // Fifth priority: tags
      else if (tagsMatch) {
        score = 4
      }
      // Lowest priority: description
      else if (descriptionMatch) {
        score = 5
      }

      return { app, score }
    })
    .filter(
      (item): item is { app: AppForCatalog; score: number } => item !== null,
    )

  // Sort by score (ascending - lower score = higher priority)
  scoredApps.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score
    }
    // If same score, sort alphabetically by display name
    return a.app.displayName.localeCompare(b.app.displayName)
  })

  return scoredApps.map((item) => item.app)
}
