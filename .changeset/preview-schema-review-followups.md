---
'@igstack/app-catalog-backend-core': patch
---

Follow-ups to the schema-isolation fix, from code review:

- The admin chat tools listed tables and columns from a hardcoded `public` while the
  SQL they go on to run resolves through `search_path`. They now describe
  `current_schema()`, so an isolated deployment is no longer told about tables it
  cannot see.
- `verifyDbSchema()` compared the configured schema to `current_schema()` as raw
  strings. Postgres truncates identifiers to 63 bytes, so a long schema name failed
  the check on a deployment that was in fact correctly isolated. It now compares the
  name Postgres kept.
- `verifyDbSchema()` armed only on the `DB_SCHEMA` environment variable, so a
  deployment isolated through config alone was never checked. It now arms on the
  resolved schema, which is the same value that feeds the pool's `search_path`.
