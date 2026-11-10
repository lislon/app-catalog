---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-shared-core': minor
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

A new "MCP servers" tab: search MCP servers by what they do, see each one's safety (read/write, needs access, sensitive data), and install it into your AI (Claude Code, Cursor, Gemini) with one click or a copied prompt; plus a shareable cart. Sources are now stored once per URL and shared between apps and MCP servers.

- The tab replaces the `/mcp` docs page and the header's MCP button.
- A deployment with no MCP servers answers `/mcp` with not found and shows no tab.
- `AppCatalogData` has a new `mcpServers` field. A client reading a cached copy from an older build should treat it as optional.
- `McpCatalogConfig` has a new `catalogMcpAvailable` flag (default `false`); set it when the deployment serves the catalog's own MCP endpoint, so install prompts point the AI at it.
- MCP server slugs must match `^[a-z0-9][a-z0-9-]*$`; the boot sync rejects others.
- Upgrade note: the `SourceReference` table is kept as an inert stub (no relations, not read or written), so a plain `prisma db push` stays additive on databases that hold rows. Drop it deliberately when you no longer need its data.
