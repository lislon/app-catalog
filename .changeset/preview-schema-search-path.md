---
'@igstack/app-catalog-backend-core': patch
---

Apply the preview-env schema to the pool the app actually uses

`DB_SCHEMA` was only honoured by `getDbClient()`, but the middleware builds its
own pool and calls `setDbClient()` with it — so the schema was dropped and every
schema-isolated deployment silently read the shared `public` tables. A preview
env whose schema had been migrated ahead of `public` then failed its startup
catalog sync with "the column does not exist in the current database".
