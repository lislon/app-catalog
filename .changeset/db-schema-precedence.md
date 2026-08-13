---
'@igstack/app-catalog-backend-core': patch
---

Let `DB_SCHEMA` outrank a schema baked into the app config

A deployment knows it is a schema-isolated preview; the config server does not,
and a config naming `public` would pin the pool straight back to the shared
tables the preview was meant to be isolated from.
