---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Backend-computed freshness on the app detail view. Each resource now carries a
`freshness: { lastCheckedAt, isStale }` (derived server-side from the source
scan's last-checked/next-check dates); the detail view renders a muted
"Last checked …" line after Sources, with a subtle "· may be out of date" note
when the entry is stale. The frontend does no date math.
