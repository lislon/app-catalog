---
'@igstack/app-catalog-backend-core': patch
---

Route Prisma's own queries to the preview-env schema

A `search_path` on the pool was necessary but not sufficient: Prisma 7 driver
adapters qualify every table name with the schema the adapter reports, so a
client built as `new PrismaPg(pool)` emits `"public"."DbResource"` no matter what
the pool's `current_schema()` resolves to. Every schema-isolated deployment
therefore kept reading — and re-syncing over — the shared `public` catalog, while
its own schema sat migrated and empty.

Core connections now go through a single `createCorePrismaClient` factory that
applies both halves (pool `search_path` + adapter `schema`), so a call site can
no longer opt out by accident; the AI-tools client, which had neither, is fixed
by the same change. `connect()` additionally logs the schema Prisma resolved and,
when `DB_SCHEMA` is set, fails fast if the database resolved `current_schema()`
to something else — Postgres silently skips a missing `search_path` entry and
falls through to `public`, which is exactly the corruption worth crashing on.
