---
'@igstack/app-catalog-backend-core': patch
---

Fix catalogAddedAt backfill: add explicit updateMany loop after sync to set DB createdAt from static catalogAddedAt values
