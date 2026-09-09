---
'@igstack/app-catalog-frontend-core': patch
---

Fix "New this week": a newly-added catalog entry never appeared there, no matter how recent, because the section only checked freshness-tracking timestamps (content-change/last-checked), which a brand-new entry never has. It now also falls back to `createdAt`.
