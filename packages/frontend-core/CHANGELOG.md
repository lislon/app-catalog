# @igstack/app-catalog-frontend-core

## 0.7.1

### Patch Changes

- [#35](https://github.com/lislon/app-catalog/pull/35) [`0d990e0`](https://github.com/lislon/app-catalog/commit/0d990e092ed31d1517add9dfbe851f357a202365) Thanks [@lislon](https://github.com/lislon)! - Gallery: clicking the fullscreen image now exits fullscreen, making zoom a
  reversible click toggle. Previously the only way out of the zoomed view was the
  ✕ button or Escape. The fullscreen image gets a `cursor-zoom-out` affordance and
  `role="button"` / `aria-label="Zoom out"`; the ✕ button and Escape handler are
  unchanged.

## 0.7.0

### Minor Changes

- [#32](https://github.com/lislon/app-catalog/pull/32) [`e8c1172`](https://github.com/lislon/app-catalog/commit/e8c11721a2eaf62a3f398fcc0baa3e1b047f23fd) Thanks [@lislon](https://github.com/lislon)! - Add a "Service Desks" view. A compact "Apps | Service Desks" segmented toggle in
  the header (no added height) switches between the app catalog (/) and a new
  /service-desks route. The Service Desks page lists all service-desk approval
  methods (type 'service') in a searchable table, each with a link that opens its
  portal in a new tab. Data rides in on the existing app-catalog query — no
  backend change.

## 0.6.5

### Patch Changes

- [#29](https://github.com/lislon/app-catalog/pull/29) [`0cb73b6`](https://github.com/lislon/app-catalog/commit/0cb73b6c300e4b08e446141d689562d64fa15211) Thanks [@lislon](https://github.com/lislon)! - Fix the deprecated-app "View replacement" link (and deep links) rendering a
  blank panel. Navigating to /app/<slug> now resolves the open app from the full
  resource set, and the catalog renders the detail panel even when the current
  search/filters would otherwise show an empty state. Previously the panel
  resolved the open app only from the filtered list, so a replacement (or any
  deep-linked app) not matching the active search changed the URL but showed
  nothing. "Hard navigation" now behaves like typing the URL in the browser.

## 0.6.4

### Patch Changes

- [#26](https://github.com/lislon/app-catalog/pull/26) [`d1efc0e`](https://github.com/lislon/app-catalog/commit/d1efc0eeeabc390cd61cc00349bf868b66dc5fd3) Thanks [@lislon](https://github.com/lislon)! - Search now falls back to deprecated apps when there are no active matches. If a
  search query returns zero non-deprecated results but deprecated apps match, the
  catalog shows those deprecated matches, displays a "showing deprecated matches"
  notice, and auto-enables the "Show Deprecated Apps" toggle so the state is
  visible and consistent. When the query has active matches, deprecated apps stay
  hidden as before; when nothing matches at all, the normal empty state shows.

## 0.6.3

### Patch Changes

- [#23](https://github.com/lislon/app-catalog/pull/23) [`7c46b42`](https://github.com/lislon/app-catalog/commit/7c46b422cc1a18dbb6129c093e160b631cb5c608) Thanks [@lislon](https://github.com/lislon)! - Fix search input losing text and focus when it auto-navigates to a single
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

- [#23](https://github.com/lislon/app-catalog/pull/23) [`1a5a8f8`](https://github.com/lislon/app-catalog/commit/1a5a8f8e2e35561cdff18d0d41a0f126d3f80c48) Thanks [@lislon](https://github.com/lislon)! - Fix the search input still resetting when typing into an empty search and the
  query narrows to a single app. The auto-navigate effect runs before the filters
  provider's async state→URL sync, so at navigation time the URL did not yet hold
  the `q` param and it was carried through as empty. The current search value is
  now injected directly into the auto-navigation's search params, so the typed
  query lands in the URL and the input stays populated across the route change.

- [#23](https://github.com/lislon/app-catalog/pull/23) [`411886a`](https://github.com/lislon/app-catalog/commit/411886ad102dde98d77b73cf20406b30fb171369) Thanks [@lislon](https://github.com/lislon)! - Fix the app detail route (`/app/$slug`) stripping the `q` search param. The
  route had no `validateSearch` schema, so TanStack Router dropped unknown params
  on navigation — including the URL-synced search query. That defeated the #10
  fix in the real router: `q` never survived the auto-navigation, so the search
  input still cleared. Added a `validateSearch` schema declaring `q` and the other
  URL-synced filter params (`filterTag`, `recent`, `filters`, `deprecated`).

## 0.6.2

### Patch Changes

- [#18](https://github.com/lislon/app-catalog/pull/18) [`36c3827`](https://github.com/lislon/app-catalog/commit/36c3827dfdb1827448c323f39ebcf2afc8dc2af3) Thanks [@lislon](https://github.com/lislon)! - Fix `useAuth must be used within AuthProvider` on the root route's fallback
  components. The `pendingComponent` (`LoadingScreen`) and `notFoundComponent`
  (`NotFoundError`) render `MainLayout → Header → useAuth()` but the router
  renders these fallbacks outside the app's provider tree. They are now wrapped
  in `TopLevelProvidersForErrors`, so any unknown URL (deterministic) and slow
  cold-load pending states (intermittent) no longer crash — they render the
  clean 404 / loading UI instead.

## 0.6.1

### Patch Changes

- [#15](https://github.com/lislon/app-catalog/pull/15) [`e0ed7e0`](https://github.com/lislon/app-catalog/commit/e0ed7e05fd76f199d4c7a40819502f65c375977b) Thanks [@lislon](https://github.com/lislon)! - Surface git SHA + commit URL in version info; footer FE line now shows the frontend-core version, its git SHA (linked to the commit), and the build pipeline id together instead of the pipeline id overwriting the version.

## 0.6.0

### Minor Changes

- [#11](https://github.com/lislon/app-catalog/pull/11) [`0f1f0a2`](https://github.com/lislon/app-catalog/commit/0f1f0a255ff3ad8a06cb92b6cdc9b0241c220e78) Thanks [@lislon](https://github.com/lislon)! - Add /app/<slug> deep-link routing: selecting an app navigates to a shareable path and opening that URL opens the app's detail in the full catalog. Replaces the ?app= query param.

## 0.5.0

### Minor Changes

- [#8](https://github.com/lislon/app-catalog/pull/8) [`749d9f7`](https://github.com/lislon/app-catalog/commit/749d9f7e505d0a897bdcb80a6698d0dbc3261e81) Thanks [@lislon](https://github.com/lislon)! - Render app description as markdown so links (e.g. Slack channels) are clickable. Adds a shared `MarkdownText` component used at the live detail render site (AppCatalogGrid) with secure external links, and removes the dead `AppDetailModal` component.

## 0.4.0

### Minor Changes

- [`80b5114`](https://github.com/lislon/app-catalog/commit/80b511412606a0238fb856b6f34ff9188e0b6eb3) Thanks [@lislon](https://github.com/lislon)! - First stable release with full feature set: sub-resources, person/group entities, app tier variants, unified Resource model, PWA auto-update, Datadog RUM integration.

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
