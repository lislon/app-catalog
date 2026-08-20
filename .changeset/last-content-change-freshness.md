---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Show when a catalog entry's content last actually changed, not when it was last
checked. The freshness scan re-reads a source on a backoff schedule and records
`lastCheckedAt` every time, whether or not anything changed — so an entry whose
data had been identical for months still advertised "Updated 22 hours ago".

Resources now carry `lastContentChangeAt` alongside `lastCheckedAt` (new nullable
`DbResource` column, plumbed through `syncAppCatalog` and the app-catalog service
into the `Freshness` payload). The detail panel's "Updated" line and the launcher's
"New this week" section read the content-change date, falling back to the check
date for entries recorded before the field existed; the tooltip exposes both dates.
