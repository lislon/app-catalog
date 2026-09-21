/**
 * Relevance ranking for catalog resources.
 *
 * Lives in shared-core so that every consumer — the catalog grid and the MCP
 * server — ranks identically and cannot drift. It must NOT import `Resource`
 * from backend-core: backend-core already depends on shared-core, so that would
 * be a cycle. Instead the functions are generic over a structural
 * `SearchableResource`, which `Resource` satisfies; each caller gets its own
 * type back.
 */

/** The subset of a resource this engine reads. */
export interface SearchableResource {
  slug: string
  displayName: string
  abbreviation?: string
  nicknames?: string[]
  aliases?: string[]
  description?: string
  tags?: string[]
  teams?: string[]
  /** Undefined for top-level apps; the parent app's slug for sub-resources. */
  parentSlug?: string
}

export interface SearchMatch {
  /** Field where the match occurred */
  field:
    | 'displayName'
    | 'abbreviation'
    | 'nicknames'
    | 'slug'
    | 'aliases'
    | 'tags'
    | 'teams'
    | 'description'
    | 'subResource'
  /** Type of match */
  type: 'exact' | 'prefix' | 'contains'
}

export interface SearchResult<T extends SearchableResource> {
  app: T
  /**
   * Which field matched and how. Absent only for the empty-query browse case,
   * where nothing was matched against.
   */
  match?: SearchMatch
}

/**
 * Latin character sitting on the same physical key as each Cyrillic one
 * (ЙЦУКЕН against QWERTY).
 */
const LATIN_BY_CYRILLIC_KEY: Record<string, string> = {
  й: 'q',
  ц: 'w',
  у: 'e',
  к: 'r',
  е: 't',
  н: 'y',
  г: 'u',
  ш: 'i',
  щ: 'o',
  з: 'p',
  х: '[',
  ъ: ']',
  ф: 'a',
  ы: 's',
  в: 'd',
  а: 'f',
  п: 'g',
  р: 'h',
  о: 'j',
  л: 'k',
  д: 'l',
  ж: ';',
  э: "'",
  я: 'z',
  ч: 'x',
  с: 'c',
  м: 'v',
  и: 'b',
  т: 'n',
  ь: 'm',
  б: ',',
  ю: '.',
  ё: '`',
}

const CYRILLIC = /[а-яё]/i

/**
 * Re-read a query as if it had been typed with the keyboard on the Cyrillic
 * layout: each Cyrillic character becomes the Latin character on the same
 * physical key, so `пфещк` reads back as `gator`. Anything with no Cyrillic key
 * is passed through.
 *
 * Case is not preserved — callers search case-insensitively.
 */
export function cyrillicLayoutToLatin(query: string): string {
  return Array.from(query)
    .map((char) => LATIN_BY_CYRILLIC_KEY[char.toLowerCase()] ?? char)
    .join('')
}

/**
 * The query to retry with when a search came back empty, or `null` when there
 * is nothing else to try. Typing an English name with the keyboard left on the
 * Cyrillic layout is the one case worth a second pass.
 */
function layoutFallbackQuery(
  searchQuery: string,
  results: readonly unknown[],
): string | null {
  if (results.length > 0 || !CYRILLIC.test(searchQuery)) return null
  const latin = cyrillicLayoutToLatin(searchQuery)
  return latin === searchQuery ? null : latin
}

/** All terms appear in the text, order-independent (AND logic). */
function allTermsMatcher(terms: string[]): (text: string) => boolean {
  return (text: string) => terms.every((term) => text.includes(term))
}

/**
 * Search and rank resources by relevance, keeping the match info.
 *
 * Only root resources (no `parentSlug`) are scored and returned. Child
 * resources contribute to their parent's score — a query matching a child's
 * displayName, alias or description surfaces the parent.
 *
 * Priority order:
 * 0. Exact match in abbreviation
 * 1. Exact match in displayName
 * 2. Exact match in nickname
 * 3. Prefix match in abbreviation
 * 4. Prefix match in displayName
 * 5. Prefix match in nickname
 * 6. Exact match in tags
 * 7. Prefix match in tags
 * 8. Contains match in abbreviation
 * 9. Contains match in displayName
 * 10. Contains match in nickname
 * 11. Contains match in tags
 * 12. Teams
 * 13. Sub-resource
 * 14. Description
 *
 * @param resources - Array of all resources (roots + children)
 * @param searchQuery - Search query string
 * @returns Filtered and sorted root resources with their match info
 */
export function searchResourcesRanked<T extends SearchableResource>(
  resources: T[],
  searchQuery: string,
): SearchResult<T>[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  // Separate root resources from children
  const rootResources = resources.filter((r) => !r.parentSlug)

  if (normalizedQuery === '') {
    return rootResources.map((app) => ({ app }))
  }

  // Split query into terms for multi-word matching (AND logic)
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean)
  const allTermsMatch = allTermsMatcher(queryTerms)

  // Build children lookup: parentSlug -> T[]
  const childrenByParent = new Map<string, T[]>()
  for (const r of resources) {
    if (r.parentSlug) {
      const list = childrenByParent.get(r.parentSlug) ?? []
      list.push(r)
      childrenByParent.set(r.parentSlug, list)
    }
  }

  // Filter and score root resources
  const scoredApps = rootResources
    .map((app): { result: SearchResult<T>; score: number } | null => {
      const name = app.displayName.toLowerCase()
      const abbreviation = app.abbreviation?.toLowerCase() || ''
      const nicknames = app.nicknames?.map((n) => n.toLowerCase()) || []
      const description = app.description?.toLowerCase() || ''
      const tags = app.tags?.join(' ').toLowerCase() || ''
      const teams = app.teams?.join(' ').toLowerCase() || ''

      const hit = (
        field: SearchMatch['field'],
        type: SearchMatch['type'],
        score: number,
      ) => ({ result: { app, match: { field, type } }, score })

      // Check exact matches first - prioritize abbreviation over displayName
      if (abbreviation && abbreviation === normalizedQuery) {
        return hit('abbreviation', 'exact', 0)
      }
      if (name === normalizedQuery) {
        return hit('displayName', 'exact', 1)
      }
      if (nicknames.some((n) => n === normalizedQuery)) {
        return hit('nicknames', 'exact', 2)
      }

      // Check prefix matches
      if (abbreviation && abbreviation.startsWith(normalizedQuery)) {
        return hit('abbreviation', 'prefix', 3)
      }
      if (name.startsWith(normalizedQuery)) {
        return hit('displayName', 'prefix', 4)
      }
      if (nicknames.some((n) => n.startsWith(normalizedQuery))) {
        return hit('nicknames', 'prefix', 5)
      }

      // Check exact match in tags (any tag exactly matches query)
      if (app.tags?.some((tag) => tag.toLowerCase() === normalizedQuery)) {
        return hit('tags', 'exact', 6)
      }

      // Check tags - prefix match (any tag starts with query)
      if (
        app.tags?.some((tag) => tag.toLowerCase().startsWith(normalizedQuery))
      ) {
        return hit('tags', 'prefix', 7)
      }

      // Check contains matches - prioritize abbreviation over displayName
      if (abbreviation && abbreviation.includes(normalizedQuery)) {
        return hit('abbreviation', 'contains', 8)
      }
      if (name.includes(normalizedQuery)) {
        return hit('displayName', 'contains', 9)
      }
      if (nicknames.some((n) => n.includes(normalizedQuery))) {
        return hit('nicknames', 'contains', 10)
      }

      // Check tags - contains match
      if (tags.includes(normalizedQuery)) {
        return hit('tags', 'contains', 11)
      }

      // Check teams (multi-word)
      if (allTermsMatch(teams)) {
        return hit('teams', 'contains', 12)
      }

      // Check description (multi-word)
      if (allTermsMatch(description)) {
        return hit('description', 'contains', 14)
      }

      // Check child resources (name, aliases, description) — supports
      // multi-word queries. Alias matching is what makes a bare numeric
      // identifier find its parent app in deployments where sub-resources
      // carry numeric aliases.
      const children = childrenByParent.get(app.slug)
      if (children) {
        const subMatch = children.some(
          (r) =>
            allTermsMatch(r.displayName.toLowerCase()) ||
            (r.aliases ?? []).some((a) => allTermsMatch(a.toLowerCase())) ||
            (r.description
              ? allTermsMatch(r.description.toLowerCase())
              : false),
        )
        if (subMatch) {
          return hit('subResource', 'contains', 13)
        }
      }

      // No match found
      return null
    })
    .filter(
      (item): item is { result: SearchResult<T>; score: number } =>
        item !== null,
    )

  // Sort by score (ascending - lower score = higher priority)
  scoredApps.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score
    }
    // If same score, sort alphabetically by display name
    return a.result.app.displayName.localeCompare(b.result.app.displayName)
  })

  const fallback = layoutFallbackQuery(normalizedQuery, scoredApps)
  if (fallback) return searchResourcesRanked(resources, fallback)

  return scoredApps.map((item) => item.result)
}

/**
 * Search and sort resources by relevance — the roots-only roll-up the catalog
 * grid uses. Same ranking as {@link searchResourcesRanked}, without the match
 * info.
 */
export function searchResources<T extends SearchableResource>(
  resources: T[],
  searchQuery: string,
): T[] {
  return searchResourcesRanked(resources, searchQuery).map((r) => r.app)
}

/**
 * Ranked search *within* one app's sub-resources — the `"<app>/<term>"` form.
 *
 * Matches a child's `displayName`, `slug`, `aliases` and `description`. Alias
 * matching is load-bearing: in a deployment where every sub-resource carries a
 * numeric alias, searching that bare number must find the sub-resource.
 *
 * @param resources - Array of all resources (roots + children)
 * @param appSlug - Parent app slug whose children to search
 * @param searchQuery - Search query string; empty returns every child
 */
export function searchWithinApp<T extends SearchableResource>(
  resources: T[],
  appSlug: string,
  searchQuery: string,
): SearchResult<T>[] {
  const children = resources.filter((r) => r.parentSlug === appSlug)
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const byName = (a: T, b: T) => a.displayName.localeCompare(b.displayName)

  if (normalizedQuery === '') {
    return [...children].sort(byName).map((app) => ({ app }))
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean)
  const allTermsMatch = allTermsMatcher(queryTerms)

  const scored = children
    .map((app): { result: SearchResult<T>; score: number } | null => {
      const name = app.displayName.toLowerCase()
      const slug = app.slug.toLowerCase()
      const aliases = app.aliases?.map((a) => a.toLowerCase()) ?? []
      const description = app.description?.toLowerCase() ?? ''

      const hit = (
        field: SearchMatch['field'],
        type: SearchMatch['type'],
        score: number,
      ) => ({ result: { app, match: { field, type } }, score })

      if (name === normalizedQuery) return hit('displayName', 'exact', 0)
      if (slug === normalizedQuery) return hit('slug', 'exact', 1)
      if (aliases.some((a) => a === normalizedQuery)) {
        return hit('aliases', 'exact', 2)
      }

      if (name.startsWith(normalizedQuery)) {
        return hit('displayName', 'prefix', 3)
      }
      if (slug.startsWith(normalizedQuery)) return hit('slug', 'prefix', 4)
      if (aliases.some((a) => a.startsWith(normalizedQuery))) {
        return hit('aliases', 'prefix', 5)
      }

      if (allTermsMatch(name)) return hit('displayName', 'contains', 6)
      if (allTermsMatch(slug)) return hit('slug', 'contains', 7)
      if (aliases.some((a) => allTermsMatch(a))) {
        return hit('aliases', 'contains', 8)
      }
      if (description && allTermsMatch(description)) {
        return hit('description', 'contains', 9)
      }

      return null
    })
    .filter(
      (item): item is { result: SearchResult<T>; score: number } =>
        item !== null,
    )

  scored.sort((a, b) =>
    a.score !== b.score
      ? a.score - b.score
      : byName(a.result.app, b.result.app),
  )

  const fallback = layoutFallbackQuery(normalizedQuery, scored)
  if (fallback) return searchWithinApp(resources, appSlug, fallback)

  return scored.map((item) => item.result)
}
