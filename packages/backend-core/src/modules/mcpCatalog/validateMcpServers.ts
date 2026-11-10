import type { McpServer } from '@igstack/app-catalog-shared-core'
import type { CatalogMcpServer } from '../../types/common/appCatalogTypes'

/**
 * A header value must match the pattern: optional auth prefix (Bearer, Token, or
 * Basic), exactly ONE `<NAME>` placeholder where NAME is `[A-Z][A-Z0-9_]*`, and
 * an optional `@domain` suffix. This prevents secrets from riding alongside
 * placeholders (R23).
 *
 * Valid: `<TOKEN>`, `Bearer <TOKEN>`, `<USERNAME>@example.com`, `<SNOWFLAKE_USERNAME>@EXAMPLE.COM`
 * Rejected: `<TOKEN>sk-live-abc123`, `prod-<TOKEN>`, `<A><`, `<2FA_TOKEN>`, `<lowercase>`, `PROD`, `you@example.com`, `<A> <B>`
 */
const VALID_HEADER_VALUE =
  /^(?:(?:Bearer|Token|Basic) )?<[A-Z][A-Z0-9_]*>(?:@[A-Za-z0-9.-]+)?$/

function hasValidPlaceholder(value: string): boolean {
  return VALID_HEADER_VALUE.test(value)
}
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
        if (!hasValidPlaceholder(value)) {
          problems.push(
            `${s.slug}: header '${name}' must match: [Bearer|Token|Basic ]<UPPERCASE_NAME>[@domain]. Valid: <TOKEN>, Bearer <TOKEN>, <USERNAME>@example.com. Rejected: <TOKEN>sk-live-abc123, prod-<TOKEN>, <A><, <2FA_TOKEN>, <lowercase>, PROD, you@example.com, <A> <B>`,
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
