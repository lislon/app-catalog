---
'@igstack/app-catalog-backend-core': patch
---

Fix catalogAddedAt backfill: use executeRaw instead of updateMany to reliably update createdAt (Prisma client engine may silently omit @default(now()) fields from updateMany)
