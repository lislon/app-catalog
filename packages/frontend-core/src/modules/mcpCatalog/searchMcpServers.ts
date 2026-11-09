import type { McpServer } from '@igstack/app-catalog-shared-core'
import { SIGN_IN } from './signIn'

type Searchable = Pick<
  McpServer,
  | 'displayName'
  | 'description'
  | 'category'
  | 'aliases'
  | 'status'
  | 'tools'
  | 'auth'
  | 'ownerSlug'
>

/** Names the page knows and a bare server does not: what a person would type. */
export interface McpSearchLookups {
  /** The configured title of a category key. */
  categoryTitle?: (key: string) => string | undefined
  /** The display name of the owning person or group. */
  ownerName?: (slug: string) => string | undefined
}

export interface McpSearchHit<TServer extends Searchable> {
  server: TServer
  score: number
  /** Names of the server's tools that contain a search term, in tool order. */
  hitTools: string[]
}

/** The query's terms: lower-cased, split on whitespace. */
export function searchTerms(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Every server that matches every term somewhere (name, description, category
 * key and title, owner, status, sign-in, aliases, tool names), best first. A name match
 * weighs most (+10), then an alias (+6), the description (+3) and each tool
 * whose name holds a term (+2); production adds 1, anything else takes 2 off.
 */
export function searchMcpServers<TServer extends Searchable>(
  servers: readonly TServer[],
  q: string,
  lookups: McpSearchLookups = {},
): McpSearchHit<TServer>[] {
  const terms = searchTerms(q)
  if (terms.length === 0) return []
  return servers
    .flatMap((server) => {
      const toolNames = server.tools.map((t) => t.name)
      const aliases = (server.aliases ?? []).map((a) => a.toLowerCase())
      const hay = [
        server.displayName,
        server.description,
        server.category,
        lookups.categoryTitle?.(server.category) ?? '',
        server.ownerSlug ? (lookups.ownerName?.(server.ownerSlug) ?? '') : '',
        // The status and sign-in as their badges read.
        server.status,
        SIGN_IN[server.auth.kind].badge,
        ...aliases,
        ...toolNames,
      ]
        .join(' ')
        .toLowerCase()
      if (!terms.every((t) => hay.includes(t))) return []

      const name = server.displayName.toLowerCase()
      const description = server.description.toLowerCase()
      let score = 0
      for (const t of terms) {
        if (name.includes(t)) score += 10
        if (aliases.some((a) => a.includes(t))) score += 6
        if (description.includes(t)) score += 3
      }
      const hitTools = toolNames.filter((n) =>
        terms.some((t) => n.toLowerCase().includes(t)),
      )
      score += hitTools.length * 2 + (server.status === 'production' ? 1 : -2)
      return [{ server, score, hitTools }]
    })
    .sort((a, b) => b.score - a.score)
}
