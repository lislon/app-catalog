# @igstack/app-catalog-backend-core

## 0.14.1

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.14.1
  - @igstack/app-catalog-table-sync@0.14.1

## 0.14.0

### Patch Changes

- [#104](https://github.com/lislon/app-catalog/pull/104) [`13b3a02`](https://github.com/lislon/app-catalog/commit/13b3a0227406581884943623a82ae44aad94eea5) Thanks [@lislon](https://github.com/lislon)! - UI improvements: search highlight, Added date, clear search button, close card button
  - Highlight matched query text in search result app names and subresource names
  - Show "Added N ago" date before Sources in app detail cards (backend: expose createdAt)
  - Clear (×) button in search input when text is present
  - Close (×) button on app card dialog

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.14.0
  - @igstack/app-catalog-table-sync@0.14.0

## 0.13.3

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.13.3
  - @igstack/app-catalog-table-sync@0.13.3

## 0.13.2

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.13.2
  - @igstack/app-catalog-table-sync@0.13.2

## 0.13.1

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.13.1
  - @igstack/app-catalog-table-sync@0.13.1

## 0.13.0

### Minor Changes

- [#83](https://github.com/lislon/app-catalog/pull/83) [`54f342c`](https://github.com/lislon/app-catalog/commit/54f342cbb733fdf5e4478f91d343befbefff9e23) Thanks [@lislon](https://github.com/lislon)! - Add `buildPgSslConfig()` and apply it when creating the pg pool, so DB TLS is
  driven by `PGSSLMODE`/`PGSSLROOTCERT` correctly. node-postgres does not honor
  those on a connection-string pool (it maps `verify-full` to a bare `ssl:true`
  and ignores the CA), so a server cert signed by a private CA (e.g. AWS RDS)
  could not be verified. The helper builds the `ssl` object explicitly:
  verify-full validates CA chain + hostname; verify-ca skips hostname;
  require/prefer validate when a CA is given; no-verify encrypts without
  validation; disable/unset leaves SSL off. Exported for downstream reuse.

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.13.0
  - @igstack/app-catalog-table-sync@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.12.0
  - @igstack/app-catalog-table-sync@0.12.0

## 0.11.0

### Patch Changes

- [#79](https://github.com/lislon/app-catalog/pull/79) [`53b9880`](https://github.com/lislon/app-catalog/commit/53b9880710cf90adf491e159d2acf9f800272c66) Thanks [@lislon](https://github.com/lislon)! - feat: adaptive launcher UI — discovery spine, search-morph, details-first, two-step access, sub-resource reveal (#38)

  Adaptive home with Your apps / New this week / Browse all sections.
  Search morphs into a keyboard-navigable results list (↑↓/↵/Esc).
  Primary click opens the detail slide-over (details-first UX); launch is quiet ↗.
  Two-step access prerequisite chain for sub-resources.
  Sub-resource reveal: open parent and seed the sub-resource search filter.
  ⌘K/Ctrl+K shortcut to focus the hero search.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.11.0
  - @igstack/app-catalog-table-sync@0.11.0

## 0.10.1

### Patch Changes

- [#75](https://github.com/lislon/app-catalog/pull/75) [`7671137`](https://github.com/lislon/app-catalog/commit/767113714d7ca32fd8ff11d73389ee926b13c10b) Thanks [@lislon](https://github.com/lislon)! - Pin @ai-sdk/provider-utils to 4.0.41 to fix broken pnpm install caused by ai@6.0.246 declaring a non-existent version 4.0.42.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.10.1
  - @igstack/app-catalog-table-sync@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.10.0
  - @igstack/app-catalog-table-sync@0.10.0

## 0.9.5

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.9.5
  - @igstack/app-catalog-table-sync@0.9.5

## 0.9.4

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.9.4
  - @igstack/app-catalog-table-sync@0.9.4

## 0.9.3

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.9.3
  - @igstack/app-catalog-table-sync@0.9.3

## 0.9.2

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.9.2
  - @igstack/app-catalog-table-sync@0.9.2

## 0.9.1

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.9.1
  - @igstack/app-catalog-table-sync@0.9.1

## 0.9.0

### Minor Changes

- [#48](https://github.com/lislon/app-catalog/pull/48) [`ed5e3ee`](https://github.com/lislon/app-catalog/commit/ed5e3eeca8520a24714eb48c8c5a9a9cbaf63291) Thanks [@lislon](https://github.com/lislon)! - Backend-computed freshness on the app detail view. Each resource now carries a
  `freshness: { lastCheckedAt, isStale }` (derived server-side from the source
  scan's last-checked/next-check dates); the detail view renders a muted
  "Last checked …" line after Sources, with a subtle "· may be out of date" note
  when the entry is stale. The frontend does no date math.

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.9.0
  - @igstack/app-catalog-table-sync@0.9.0

## 0.8.1

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.8.1
  - @igstack/app-catalog-table-sync@0.8.1

## 0.8.0

### Minor Changes

- [#38](https://github.com/lislon/app-catalog/pull/38) [`847e5f9`](https://github.com/lislon/app-catalog/commit/847e5f9dfe1e903100f7a76cf92eec79e84d3c57) Thanks [@lislon](https://github.com/lislon)! - Service Desks view: show an optional description as muted subtext under each
  service desk's name. Adds an optional `description` field to the service
  approval-method config (`ServiceConfig.description`); the Service Desks table
  renders it beneath the name when present.

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.8.0
  - @igstack/app-catalog-table-sync@0.8.0

## 0.7.1

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.7.1
  - @igstack/app-catalog-table-sync@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.7.0
  - @igstack/app-catalog-table-sync@0.7.0

## 0.6.5

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.6.5
  - @igstack/app-catalog-table-sync@0.6.5

## 0.6.4

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.6.4
  - @igstack/app-catalog-table-sync@0.6.4

## 0.6.3

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.6.3
  - @igstack/app-catalog-table-sync@0.6.3

## 0.6.2

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.6.2
  - @igstack/app-catalog-table-sync@0.6.2

## 0.6.1

### Patch Changes

- [#15](https://github.com/lislon/app-catalog/pull/15) [`e0ed7e0`](https://github.com/lislon/app-catalog/commit/e0ed7e05fd76f199d4c7a40819502f65c375977b) Thanks [@lislon](https://github.com/lislon)! - Surface git SHA + commit URL in version info; footer FE line now shows the frontend-core version, its git SHA (linked to the commit), and the build pipeline id together instead of the pipeline id overwriting the version.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.6.1
  - @igstack/app-catalog-table-sync@0.6.1

## 0.6.0

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.6.0
  - @igstack/app-catalog-table-sync@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@0.5.0
  - @igstack/app-catalog-table-sync@0.5.0

## 0.4.0

### Minor Changes

- [`80b5114`](https://github.com/lislon/app-catalog/commit/80b511412606a0238fb856b6f34ff9188e0b6eb3) Thanks [@lislon](https://github.com/lislon)! - First stable release with full feature set: sub-resources, person/group entities, app tier variants, unified Resource model, PWA auto-update, Datadog RUM integration.

### Patch Changes

- Updated dependencies [[`80b5114`](https://github.com/lislon/app-catalog/commit/80b511412606a0238fb856b6f34ff9188e0b6eb3)]:
  - @igstack/app-catalog-shared-core@0.4.0
  - @igstack/app-catalog-table-sync@0.4.0

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
