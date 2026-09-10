---
'@igstack/app-catalog-frontend-core': patch
---

Fix "New this week" so it reflects what was actually ADDED to the catalog. It previously keyed off the freshness job's re-check timestamps (`freshness.lastContentChangeAt` / `lastCheckedAt`), which meant a months-old app that had merely been re-verified showed up as new, while a genuinely new entry — which has no freshness data yet — could be missing. The section now filters and sorts on the catalog add date (`createdAt`) alone, so it agrees with the card's own "Added …" label.
