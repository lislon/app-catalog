# @igstack/app-catalog-frontend-core

## 0.4.0-alpha-20260727200037

### Patch Changes

- [#20](https://github.com/lislon/app-catalog/pull/20) [`7aefd80`](https://github.com/lislon/app-catalog/commit/7aefd8038a15943bc2ae3e81e412b33fe46f632c) Thanks [@lislon](https://github.com/lislon)! - Fix search input losing text and focus when it auto-navigates to a single
  match. Typing a query that narrows the catalog to one app auto-opens that app's
  detail page, but the search value lived in component-local state (not the URL)
  and the filters provider remounts per route — so the input and keyboard focus
  were wiped on navigation. The search query is now URL-synced (`q` param) and
  carried through the auto-navigation, so the input stays populated and focused.

  Also fixes a latent bug in `useUrlSyncedState`: it only synced state→URL when
  the param was already present at mount, so a value first set from its default
  (e.g. the first keystroke in an empty search) never reached the URL. The
  existing in-sync equality check already prevents default-value pollution, so
  the redundant init gate was removed.

## 0.4.0-alpha-20260727044221

### Patch Changes

- [#17](https://github.com/lislon/app-catalog/pull/17) [`115acd1`](https://github.com/lislon/app-catalog/commit/115acd121ec1a7a0c4abe0af6fdf8187a40ba8d8) Thanks [@lislon](https://github.com/lislon)! - Fix `useAuth must be used within AuthProvider` on the root route's fallback
  components. The `pendingComponent` (`LoadingScreen`) and `notFoundComponent`
  (`NotFoundError`) render `MainLayout → Header → useAuth()` but the router
  renders these fallbacks outside the app's provider tree. They are now wrapped
  in `TopLevelProvidersForErrors`, so any unknown URL (deterministic) and slow
  cold-load pending states (intermittent) no longer crash — they render the
  clean 404 / loading UI instead.

## 0.4.0-alpha-20260726003135

### Patch Changes

- [#14](https://github.com/lislon/app-catalog/pull/14) [`e217812`](https://github.com/lislon/app-catalog/commit/e217812b08b70a1e3397e433477e28347359d77a) Thanks [@lislon](https://github.com/lislon)! - Surface git SHA + commit URL in version info; footer FE line now shows the frontend-core version, its git SHA (linked to the commit), and the build pipeline id together instead of the pipeline id overwriting the version.

## 0.4.0-alpha-20260725214358

### Patch Changes

- [#13](https://github.com/lislon/app-catalog/pull/13) [`d3d216f`](https://github.com/lislon/app-catalog/commit/d3d216f49901ee08a477a9cbb43033b1f27ddb25) Thanks [@lislon](https://github.com/lislon)! - Dev-only warning when the catalog loads resources but none are top-level (fingerprints a frontend/backend-core version skew or a stale service worker), so an empty catalog is diagnosable at a glance instead of looking like a data outage.

## 0.4.0-alpha-20260725185223

### Minor Changes

- [#10](https://github.com/lislon/app-catalog/pull/10) [`26fbda1`](https://github.com/lislon/app-catalog/commit/26fbda1fca2767f77f11f87c47bab7a323620cb6) Thanks [@lislon](https://github.com/lislon)! - Add /app/<slug> deep-link routing: selecting an app navigates to a shareable path and opening that URL opens the app's detail in the full catalog. Replaces the ?app= query param.

- [`bb394de`](https://github.com/lislon/app-catalog/commit/bb394deb104d27714202f1691639a38ccd0a553f) Thanks [@lislon](https://github.com/lislon)! - Render app description as markdown so links (e.g. Slack channels) are clickable. Adds a shared `MarkdownText` component used at the live detail render site (AppCatalogGrid) with secure external links, and removes the dead `AppDetailModal` component.

## 0.3.1-alpha-20260724220657

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260724205941

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260724172703

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260406011911

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260405015231

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260404005709

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260403020019

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260401160844

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260401160050

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260401002820

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260329185327

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260328160000

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260328155123

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260328001855

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260327223036

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260327034128

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260320140750

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317225951

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317200702

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317183841

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260317175519

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260308004653

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260306003829

### Patch Changes

- Snapshot release from alpha branch

## 0.3.1-alpha-20260305175850

### Patch Changes

- Snapshot release from alpha branch

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

## 0.2.1

## 0.2.0

## 0.1.1-alpha-20260304050203

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303225217

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303220950

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303213545

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303212813

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303183112

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260303150843

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302172844

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302052404

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302045338

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302043803

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302040925

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260302025010

### Patch Changes

- Snapshot release from alpha branch

## 0.1.1-alpha-20260228223319

### Patch Changes

- Snapshot release from alpha branch

## 2.0.1-alpha-20260224192214

### Patch Changes

- Snapshot release from alpha branch

## 2.0.1-alpha-20260224152429

### Patch Changes

- Changed readme

## 2.0.1-alpha-20260224145405

### Patch Changes

- Alpha snapshot release

## 0.0.0-alpha-20260224145132

### Patch Changes

- Alpha snapshot release
