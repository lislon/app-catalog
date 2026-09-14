---
'@igstack/app-catalog-shared-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Move the catalog ranking engine into shared-core and add an MCP docs page.

`shared-core` now owns the search engine so both the UI and server-side callers
rank resources identically. It exports `searchResources` (roots-only roll-up,
behaviour unchanged from the previous frontend-only helper),
`searchResourcesRanked` (same pass, but returns which field matched and how) and
`searchWithinApp` (ranked search over one app's sub-resources, matching
displayName, slug, aliases and description). The functions are generic over a
structural `SearchableResource`, so no dependency on any persistence type.
`highlightText` stays in `frontend-core`.

`frontend-core` gains a `/mcp` route, reachable from the header view toggle,
documenting the catalog's MCP server: endpoint, CLI one-liner and `.mcp.json`
snippet — all built from the current origin — plus a tool reference read live
from the server's own registry, so it cannot go stale.
