---
'@igstack/app-catalog-frontend-core': patch
---

Fix "New this week" surfacing apps that were only re-checked, not newly added. The section now filters and sorts on the catalog add date (`createdAt`, backfilled from `catalogAddedAt`) alone, and no longer falls back to `freshness.lastContentChangeAt` / `lastCheckedAt` — so it agrees with the card's own "Added …" label instead of contradicting it.
