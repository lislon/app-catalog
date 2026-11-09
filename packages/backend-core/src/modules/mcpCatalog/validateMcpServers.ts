import type { McpServer } from '@igstack/app-catalog-shared-core'
import type { CatalogMcpServer } from '../../types/common/appCatalogTypes'

/** A header value must be a whole `<NAME>` placeholder, never a real token. */
const PLACEHOLDER = /^<[^<>]+>$/
/** Lowercase words joined by `-`: no comma (the cart's separator) and no leading `-` (read as a CLI flag). */
const SLUG = /^[a-z0-9][a-z0-9-]*$/

/**
 * Checks MCP server records against the catalog. Throws one Error listing every
 * problem, each prefixed with the server's slug, so a bad config fails the boot.
 */
export function validateMcpServers(
  servers: (McpServer | CatalogMcpServer)[],
  known: { resourceSlugs: Set<string>; ownerSlugs: Set<string> },
): void {
  const problems: string[] = []
  const seen = new Set<string>()

  for (const s of servers) {
    if (seen.has(s.slug)) problems.push(`${s.slug}: duplicate slug`)
    seen.add(s.slug)
    if (!SLUG.test(s.slug)) {
      problems.push(
        `${s.slug}: slug must be lowercase letters, digits and '-', not starting with '-'`,
      )
    }

    for (const app of s.requiredAppSlugs ?? []) {
      if (!known.resourceSlugs.has(app)) {
        problems.push(
          `${s.slug}: requiredAppSlugs entry '${app}' is not an app in the catalog`,
        )
      }
    }
    if (s.ownerSlug && !known.ownerSlugs.has(s.ownerSlug)) {
      problems.push(
        `${s.slug}: ownerSlug '${s.ownerSlug}' is not a known person or group`,
      )
    }
    if (s.sources.length === 0) problems.push(`${s.slug}: sources is empty`)
    if (s.tools.length === 0) problems.push(`${s.slug}: tools is empty`)

    if (s.transport.type === 'http') {
      for (const [name, value] of Object.entries(s.transport.headers ?? {})) {
        if (!PLACEHOLDER.test(value)) {
          problems.push(
            `${s.slug}: header '${name}' must be a <...> placeholder, not a value`,
          )
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid MCP servers:\n${problems.map((p) => `- ${p}`).join('\n')}`,
    )
  }
}
