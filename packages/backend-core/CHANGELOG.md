# @igstack/app-catalog-backend-core

## 0.4.0-alpha-20260817183828

### Patch Changes

- [#133](https://github.com/lislon/app-catalog/pull/133) [`a93e66f`](https://github.com/lislon/app-catalog/commit/a93e66f7cc0c46ac2edc29b0d581b8f43668bb53) Thanks [@lislon](https://github.com/lislon)! - Route Prisma's own queries to the preview-env schema

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

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260817183828
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260817183828

## 0.4.0-alpha-20260814233321

### Patch Changes

- [#132](https://github.com/lislon/app-catalog/pull/132) [`0b1eefe`](https://github.com/lislon/app-catalog/commit/0b1eefe32dd6b9d0d6a995120c3f26ace4e28ebe) Thanks [@lislon](https://github.com/lislon)! - Pin the `ai` and `@ai-sdk/*` dependencies to exact versions, and drop `ai` and
  `@ai-sdk/react` from `frontend-core`, where neither was imported.

  Those packages publish several times a day and hard-pin each other exactly, so a
  caret range resolved to a release that could be minutes old — faster than npm's
  registry metadata becomes consistent. Fresh installs failed intermittently with
  `ERR_PNPM_NO_MATCHING_VERSION` on a transitive `@ai-sdk` package that was in fact
  published. Exact versions in the published `dependencies` make the resolution
  deterministic for consumers too, which a root `overrides` block cannot do.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260814233321
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260814233321

## 0.4.0-alpha-20260814035133

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260814035133
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260814035133

## 0.4.0-alpha-20260813154215

### Patch Changes

- [#130](https://github.com/lislon/app-catalog/pull/130) [`2f1ea8a`](https://github.com/lislon/app-catalog/commit/2f1ea8a375f82d8ea39fbbb1df30c7d57b7d2a07) Thanks [@lislon](https://github.com/lislon)! - Let `DB_SCHEMA` outrank a schema baked into the app config

  A deployment knows it is a schema-isolated preview; the config server does not,
  and a config naming `public` would pin the pool straight back to the shared
  tables the preview was meant to be isolated from.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260813154215
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260813154215

## 0.4.0-alpha-20260813153122

### Patch Changes

- [#129](https://github.com/lislon/app-catalog/pull/129) [`5e5ecb0`](https://github.com/lislon/app-catalog/commit/5e5ecb03dd295bcecb141405acd55064729fb2e3) Thanks [@lislon](https://github.com/lislon)! - Apply the preview-env schema to the pool the app actually uses

  `DB_SCHEMA` was only honoured by `getDbClient()`, but the middleware builds its
  own pool and calls `setDbClient()` with it — so the schema was dropped and every
  schema-isolated deployment silently read the shared `public` tables. A preview
  env whose schema had been migrated ahead of `public` then failed its startup
  catalog sync with "the column does not exist in the current database".

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260813153122
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260813153122

## 0.4.0-alpha-20260813065159

### Minor Changes

- [#128](https://github.com/lislon/app-catalog/pull/128) [`8924f5d`](https://github.com/lislon/app-catalog/commit/8924f5d032da40d40191ee35da9e09a9c6f1c032) Thanks [@lislon](https://github.com/lislon)! - Show when a catalog entry's content last actually changed, not when it was last
  checked. The freshness scan re-reads a source on a backoff schedule and records
  `lastCheckedAt` every time, whether or not anything changed — so an entry whose
  data had been identical for months still advertised "Updated 22 hours ago".

  Resources now carry `lastContentChangeAt` alongside `lastCheckedAt` (new nullable
  `DbResource` column, plumbed through `syncAppCatalog` and the app-catalog service
  into the `Freshness` payload). The detail panel's "Updated" line and the launcher's
  "New this week" section read the content-change date, falling back to the check
  date for entries recorded before the field existed; the tooltip exposes both dates.

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260813065159
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260813065159

## 0.4.0-alpha-20260813024744

### Patch Changes

- [#70](https://github.com/lislon/app-catalog/pull/70) [`7aeae6b`](https://github.com/lislon/app-catalog/commit/7aeae6b4e04879e5d97cf075de86bff15525ec34) Thanks [@lislon](https://github.com/lislon)! - Serve SVG assets as `image/svg+xml`. `sharp` reports `format === 'svg'`, but
  `formatToMime` had no `svg` key, so `parseAssetMeta()` fell through to the
  `image/${format}` fallback and produced the invalid `image/svg`. Behind a
  `X-Content-Type-Options: nosniff` proxy, browsers refuse to render such a
  response in an `<img>`, so SVG icons silently fell back to placeholder UI.

  `upsertAsset()` now also rewrites the stored `mimeType` when it no longer matches
  the freshly-derived one. It reuses an existing row by name to avoid duplicating
  the binary, and previously returned early without touching the metadata — so rows
  written by the old derivation could never be corrected, not even by a re-sync.
  The rewrite is idempotent and repairs stale rows on the next sync.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260813024744
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260813024744

## 0.4.0-alpha-20260812171537

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260812171537
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260812171537

## 0.4.0-alpha-20260812005550

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260812005550
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260812005550

## 0.4.0-alpha-20260812004355

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260812004355
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260812004355

## 0.4.0-alpha-20260811223520

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811223520
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811223520

## 0.4.0-alpha-20260811221253

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811221253
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811221253

## 0.4.0-alpha-20260811214151

### Patch Changes

- [#115](https://github.com/lislon/app-catalog/pull/115) [`b2ae724`](https://github.com/lislon/app-catalog/commit/b2ae724183be12cd267b6d834707e963225c60e3) Thanks [@lislon](https://github.com/lislon)! - UI improvements batch: clear search, Added date, two-step access badges, MCP export
  - Clear (×) button in search input when text is present
  - "Added N ago" date shown before Sources in app detail cards (backend: expose createdAt)
  - Step 1 / Step 2 badges for two-step access apps (postApprovalInstructions + requestPrompt)
  - Export getResourcesFromPrisma from backend-core public API (for MCP server)

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811214151
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811214151

## 0.4.0-alpha-20260811213256

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811213256
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811213256

## 0.4.0-alpha-20260811212059

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811212059
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811212059

## 0.4.0-alpha-20260811181653

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811181653
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811181653

## 0.4.0-alpha-20260811154702

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811154702
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811154702

## 0.4.0-alpha-20260811152919

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811152919
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811152919

## 0.4.0-alpha-20260811142024

### Patch Changes

- [#103](https://github.com/lislon/app-catalog/pull/103) [`c8cc18b`](https://github.com/lislon/app-catalog/commit/c8cc18b92fb3ac921a892fadad0a384e63fc57bc) Thanks [@lislon](https://github.com/lislon)! - UI improvements: search highlight, Added date, clear search button, close card button
  - Highlight matched query text in search result app names and subresource names
  - Show "Added N ago" date before Sources in app detail cards (backend: expose createdAt)
  - Clear (×) button in search input when text is present
  - Close (×) button on app card dialog

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811142024
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811142024

## 0.4.0-alpha-20260811053337

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811053337
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811053337

## 0.4.0-alpha-20260811052504

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811052504
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811052504

## 0.4.0-alpha-20260811051931

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811051931
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811051931

## 0.4.0-alpha-20260811020745

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260811020745
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260811020745

## 0.4.0-alpha-20260810232952

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260810232952
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260810232952

## 0.4.0-alpha-20260810225555

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260810225555
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260810225555

## 0.4.0-alpha-20260810213549

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260810213549
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260810213549

## 0.4.0-alpha-20260810153641

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260810153641
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260810153641

## 0.4.0-alpha-20260808192944

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260808192944
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260808192944

## 0.4.0-alpha-20260807223013

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807223013
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807223013

## 0.4.0-alpha-20260807203854

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807203854
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807203854

## 0.4.0-alpha-20260807174540

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807174540
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807174540

## 0.4.0-alpha-20260807164058

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807164058
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807164058

## 0.4.0-alpha-20260807053627

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807053627
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807053627

## 0.4.0-alpha-20260807050147

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807050147
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807050147

## 0.4.0-alpha-20260807041139

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807041139
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807041139

## 0.4.0-alpha-20260807033203

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807033203
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807033203

## 0.4.0-alpha-20260807030804

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807030804
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807030804

## 0.4.0-alpha-20260807022842

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807022842
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807022842

## 0.4.0-alpha-20260807003952

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260807003952
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260807003952

## 0.4.0-alpha-20260806002918

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260806002918
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260806002918

## 0.4.0-alpha-20260806002251

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260806002251
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260806002251

## 0.4.0-alpha-20260805180712

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260805180712
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260805180712

## 0.4.0-alpha-20260805143647

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260805143647
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260805143647

## 0.4.0-alpha-20260804214537

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260804214537
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260804214537

## 0.4.0-alpha-20260804172958

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260804172958
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260804172958

## 0.4.0-alpha-20260804161437

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260804161437
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260804161437

## 0.4.0-alpha-20260731185816

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260731185816
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260731185816

## 0.4.0-alpha-20260730182101

### Minor Changes

- [#47](https://github.com/lislon/app-catalog/pull/47) [`7c22d5d`](https://github.com/lislon/app-catalog/commit/7c22d5d7fddb2fb6f3d288397d92a889c888ea81) Thanks [@lislon](https://github.com/lislon)! - Backend-computed freshness on the app detail view. Each resource now carries a
  `freshness: { lastCheckedAt, isStale }` (derived server-side from the source
  scan's last-checked/next-check dates); the detail view renders a muted
  "Last checked …" line after Sources, with a subtle "· may be out of date" note
  when the entry is stale. The frontend does no date math.

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260730182101
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260730182101

## 0.4.0-alpha-20260730170821

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260730170821
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260730170821

## 0.4.0-alpha-20260729145918

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260729145918
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260729145918

## 0.4.0-alpha-20260729145014

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260729145014
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260729145014

## 0.4.0-alpha-20260729112817

### Minor Changes

- [#37](https://github.com/lislon/app-catalog/pull/37) [`b966cfc`](https://github.com/lislon/app-catalog/commit/b966cfccd3dc2ec8a9e76afe10c0ff6d31c70485) Thanks [@lislon](https://github.com/lislon)! - Service Desks view: show an optional description as muted subtext under each
  service desk's name. Adds an optional `description` field to the service
  approval-method config (`ServiceConfig.description`); the Service Desks table
  renders it beneath the name when present.

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260729112817
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260729112817

## 0.4.0-alpha-20260728193854

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260728193854
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260728193854

## 0.4.0-alpha-20260728181436

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260728181436
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260728181436

## 0.4.0-alpha-20260728153301

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260728153301
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260728153301

## 0.4.0-alpha-20260728040254

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260728040254
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260728040254

## 0.4.0-alpha-20260727205627

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260727205627
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260727205627

## 0.4.0-alpha-20260727202703

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260727202703
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260727202703

## 0.4.0-alpha-20260727200037

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260727200037
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260727200037

## 0.4.0-alpha-20260727044221

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260727044221
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260727044221

## 0.4.0-alpha-20260726003135

### Patch Changes

- [#14](https://github.com/lislon/app-catalog/pull/14) [`e217812`](https://github.com/lislon/app-catalog/commit/e217812b08b70a1e3397e433477e28347359d77a) Thanks [@lislon](https://github.com/lislon)! - Surface git SHA + commit URL in version info; footer FE line now shows the frontend-core version, its git SHA (linked to the commit), and the build pipeline id together instead of the pipeline id overwriting the version.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260726003135
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260726003135

## 0.4.0-alpha-20260725214358

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260725214358
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260725214358

## 0.4.0-alpha-20260725185223

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.4.0-alpha-20260725185223
  - @igstack/app-catalog-table-sync@0.4.0-alpha-20260725185223

## 0.3.1-alpha-20260724220657

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260724220657
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260724220657

## 0.3.1-alpha-20260724205941

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260724205941
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260724205941

## 0.3.1-alpha-20260724172703

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260724172703
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260724172703

## 0.3.1-alpha-20260406011911

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260406011911
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260406011911

## 0.3.1-alpha-20260405015231

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260405015231
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260405015231

## 0.3.1-alpha-20260404005709

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260404005709
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260404005709

## 0.3.1-alpha-20260403020019

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260403020019
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260403020019

## 0.3.1-alpha-20260401160844

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260401160844
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260401160844

## 0.3.1-alpha-20260401160050

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260401160050
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260401160050

## 0.3.1-alpha-20260401002820

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260401002820
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260401002820

## 0.3.1-alpha-20260329185327

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260329185327
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260329185327

## 0.3.1-alpha-20260328160000

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260328160000
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260328160000

## 0.3.1-alpha-20260328155123

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260328155123
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260328155123

## 0.3.1-alpha-20260328001855

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260328001855
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260328001855

## 0.3.1-alpha-20260327223036

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260327223036
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260327223036

## 0.3.1-alpha-20260327034128

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260327034128
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260327034128

## 0.3.1-alpha-20260320140750

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260320140750
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260320140750

## 0.3.1-alpha-20260317225951

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260317225951
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260317225951

## 0.3.1-alpha-20260317200702

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260317200702
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260317200702

## 0.3.1-alpha-20260317183841

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260317183841
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260317183841

## 0.3.1-alpha-20260317175519

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260317175519
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260317175519

## 0.3.1-alpha-20260308004653

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260308004653
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260308004653

## 0.3.1-alpha-20260306003829

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260306003829
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260306003829

## 0.3.1-alpha-20260305175850

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.1-alpha-20260305175850
  - @igstack/app-catalog-table-sync@0.3.1-alpha-20260305175850

## 0.3.0

### Minor Changes

- Remove admin functionality and fix Prisma type leaks from tRPC

  **Backend changes:**
  - Removed admin chat handler and database tools
  - Removed approval method management (router and sync)
  - Removed app catalog admin router and backup/restore endpoints
  - Removed icon and screenshot tRPC routers (leaked Prisma types)
  - TRPCRouter now only contains auth and appCatalog queries (plain types only)
  - REST controllers remain for icons and screenshots

  **Frontend changes:**
  - Removed all admin routes and UI (admin chat, approval methods, app catalog admin)
  - Removed icon management UI components
  - Screenshots continue using REST endpoints (/api/screenshots/:id)

  **Prisma 7 adapter:**
  - Added @prisma/adapter-pg and @types/pg to catalog
  - Rely on transitive pg dependency from adapter-pg

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.3.0
  - @igstack/app-catalog-table-sync@0.3.0

## 0.2.1

### Patch Changes

- Fix Prisma 7 adapter dependencies: add @prisma/adapter-pg, @types/pg to catalog, rely on transitive pg dependency

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.2.1
  - @igstack/app-catalog-table-sync@0.2.1

## 0.2.0

### Minor Changes

- Add Prisma 7 adapter support with binary-free PostgreSQL driver
  - Add @prisma/adapter-pg and pg driver dependencies
  - Update database client initialization to use PrismaPg adapter
  - Remove Prisma binary engine requirements
  - Improve deployment footprint with smaller bundle size

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.2.0
  - @igstack/app-catalog-table-sync@0.2.0

## 0.1.1-alpha-20260304050203

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260304050203
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260304050203

## 0.1.1-alpha-20260303225217

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260303225217
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260303225217

## 0.1.1-alpha-20260303220950

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260303220950
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260303220950

## 0.1.1-alpha-20260303213545

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260303213545
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260303213545

## 0.1.1-alpha-20260303212813

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260303212813
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260303212813

## 0.1.1-alpha-20260303183112

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260303183112
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260303183112

## 0.1.1-alpha-20260303150843

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260303150843
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260303150843

## 0.1.1-alpha-20260302172844

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260302172844
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260302172844

## 0.1.1-alpha-20260302052404

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260302052404
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260302052404

## 0.1.1-alpha-20260302045338

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260302045338
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260302045338

## 0.1.1-alpha-20260302043803

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260302043803
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260302043803

## 0.1.1-alpha-20260302040925

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260302040925
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260302040925

## 0.1.1-alpha-20260302025010

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260302025010
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260302025010

## 0.1.1-alpha-20260228223319

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.1.1-alpha-20260228223319
  - @igstack/app-catalog-table-sync@0.1.1-alpha-20260228223319

## 2.0.1-alpha-20260224192214

### Patch Changes

- Snapshot release from alpha branch

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.1-alpha-20260224192214
  - @igstack/app-catalog-table-sync@2.0.1-alpha-20260224192214

## 2.0.1-alpha-20260224152429

### Patch Changes

- Changed readme

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.1-alpha-20260224152429
  - @igstack/app-catalog-table-sync@2.0.1-alpha-20260224152429

## 2.0.1-alpha-20260224145405

### Patch Changes

- Alpha snapshot release

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.1-alpha-20260224145405
  - @igstack/app-catalog-table-sync@2.0.1-alpha-20260224145405

## 0.0.0-alpha-20260224145132

### Patch Changes

- Alpha snapshot release

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.0.0-alpha-20260224145132
  - @igstack/app-catalog-table-sync@0.0.0-alpha-20260224145132
