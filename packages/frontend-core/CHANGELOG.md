# @igstack/app-catalog-frontend-core

## 0.4.0-alpha-20260811223520

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811221253

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811214151

### Minor Changes

- [#115](https://github.com/lislon/app-catalog/pull/115) [`b2ae724`](https://github.com/lislon/app-catalog/commit/b2ae724183be12cd267b6d834707e963225c60e3) Thanks [@lislon](https://github.com/lislon)! - UI improvements batch: clear search, Added date, two-step access badges, MCP export
  - Clear (×) button in search input when text is present
  - "Added N ago" date shown before Sources in app detail cards (backend: expose createdAt)
  - Step 1 / Step 2 badges for two-step access apps (postApprovalInstructions + requestPrompt)
  - Export getResourcesFromPrisma from backend-core public API (for MCP server)

## 0.4.0-alpha-20260811213256

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811212059

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811181653

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811154702

### Patch Changes

- [#108](https://github.com/lislon/app-catalog/pull/108) [`da24c9b`](https://github.com/lislon/app-catalog/commit/da24c9bb9c8d68e10f005cfc51f6f1c9bb0b6801) Thanks [@lislon](https://github.com/lislon)! - Fix Esc key on mouse-opened app card; gallery Esc no longer clears search

## 0.4.0-alpha-20260811152919

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811142024

### Minor Changes

- [#103](https://github.com/lislon/app-catalog/pull/103) [`c8cc18b`](https://github.com/lislon/app-catalog/commit/c8cc18b92fb3ac921a892fadad0a384e63fc57bc) Thanks [@lislon](https://github.com/lislon)! - UI improvements: search highlight, Added date, clear search button, close card button
  - Highlight matched query text in search result app names and subresource names
  - Show "Added N ago" date before Sources in app detail cards (backend: expose createdAt)
  - Clear (×) button in search input when text is present
  - Close (×) button on app card dialog

## 0.4.0-alpha-20260811053337

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811052504

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811051931

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260811020745

### Patch Changes

- [#94](https://github.com/lislon/app-catalog/pull/94) [`e30e0d2`](https://github.com/lislon/app-catalog/commit/e30e0d2e96df69c0b4361f7e99729dc2d220653b) Thanks [@lislon](https://github.com/lislon)! - Fix markdown prose list rendering — add .prose ol/ul rules to index.css so list markers compile into the published dist bundle (Tailwind v4 JIT doesn't compile utility classes from published npm dist TSX).

## 0.4.0-alpha-20260810232952

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260810225555

### Patch Changes

- [#89](https://github.com/lislon/app-catalog/pull/89) [`fc67007`](https://github.com/lislon/app-catalog/commit/fc670076e8ae6547a8e26e27544337261aafc62d) Thanks [@lislon](https://github.com/lislon)! - Fix list marker styles in markdown prose blocks — Tailwind preflight resets list-style to none; add explicit list-decimal/list-disc utilities so numbered and bulleted lists render correctly in access request comments and post-approval instructions.

## 0.4.0-alpha-20260810213549

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260810153641

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260808192944

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807223013

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807203854

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807174540

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807164058

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807053627

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807050147

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807041139

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807033203

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807030804

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807022842

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260807003952

### Patch Changes

- [#69](https://github.com/lislon/app-catalog/pull/69) [`59a609d`](https://github.com/lislon/app-catalog/commit/59a609dd7e6cb17350737ec7a97b2a98af406305) Thanks [@lislon](https://github.com/lislon)! - Make the display serif actually render and surface the resource owner. The warm
  theme defined a Fraunces display-serif token but nothing loaded the webfont or
  applied it, so headings fell back to the system sans. Load Fraunces + Nunito
  Sans via a real stylesheet link and apply the serif to the key display headings
  (the wordmark, the app detail title, group headers, and the onboarding title).

  Also render an **Owner** row in the app detail — "who is responsible for this
  resource" — from `ownerPersonSlug`, kept visually distinct from the access
  approver (who decides access requests), per the domain model.

## 0.4.0-alpha-20260806002918

### Minor Changes

- [#68](https://github.com/lislon/app-catalog/pull/68) [`5a42440`](https://github.com/lislon/app-catalog/commit/5a42440b26da98ca1375ac3234b81e86b112d980) Thanks [@lislon](https://github.com/lislon)! - Re-theme the catalog with a warm, crafted visual identity matched to the
  hand-drawn logo. The previous palette was built around a generic purple accent
  on a cool blue-gray background that read as a templated dashboard. The design
  tokens now use a warm "crayon" palette derived from the logo — an orange primary
  with amber/coral/blue/green chart colors — on a cream paper background, with a
  rounder corner radius and a friendlier type pairing (Fraunces display serif +
  Nunito Sans body). Because every component reads these tokens, the whole app —
  header, filters, buttons, badges, and the app detail panel — picks up the new
  look at once, in both light and dark mode.

  Also fixes the app detail "how to get access" section so it is never blank:
  methods with no clickable target now render an explicit line — "open to
  everyone, no request needed" for open access, or a fallback pointing to the
  resource owner when the process is undocumented — instead of rendering nothing.
  The section is retitled from "Access Request" to the task-oriented "How to get
  access".

  Each catalog row now also has a secondary "open in new tab" launch button for
  the resource URL, so the fast "I just want the link" jump stays one click away
  while the primary row click opens the access detail.

## 0.4.0-alpha-20260806002251

### Minor Changes

- [#67](https://github.com/lislon/app-catalog/pull/67) [`f81663d`](https://github.com/lislon/app-catalog/commit/f81663d144c9f4beb71d0390ac0a20483b86562e) Thanks [@lislon](https://github.com/lislon)! - Re-theme the catalog with a warm, crafted visual identity matched to the
  hand-drawn logo. The previous palette was built around a generic purple accent
  on a cool blue-gray background that read as a templated dashboard. The design
  tokens now use a warm "crayon" palette derived from the logo — an orange primary
  with amber/coral/blue/green chart colors — on a cream paper background, with a
  rounder corner radius and a friendlier type pairing (Fraunces display serif +
  Nunito Sans body). Because every component reads these tokens, the whole app —
  header, filters, buttons, badges, and the app detail panel — picks up the new
  look at once, in both light and dark mode.

  Also fixes the app detail "how to get access" section so it is never blank:
  methods with no clickable target now render an explicit line — "open to
  everyone, no request needed" for open access, or a fallback pointing to the
  resource owner when the process is undocumented — instead of rendering nothing.
  The section is retitled from "Access Request" to the task-oriented "How to get
  access".

  Each catalog row now also has a secondary "open in new tab" launch button for
  the resource URL, so the fast "I just want the link" jump stays one click away
  while the primary row click opens the access detail.

## 0.4.0-alpha-20260805180712

### Patch Changes

- [#66](https://github.com/lislon/app-catalog/pull/66) [`197e6e3`](https://github.com/lislon/app-catalog/commit/197e6e343fd1bc351d50b10a9660da9eb42a5ea3) Thanks [@lislon](https://github.com/lislon)! - Keep the catalog search text out of the URL. The search box previously synced
  its value to a `?q=` query param, so opening or sharing an app link carried the
  search term along (`/app/<slug>?q=<search>`), cluttering the deep link. The
  search value now persists in `sessionStorage` instead, so it still survives the
  per-route remount of the filters provider — including the auto-navigation to a
  single match, where the input text must not be lost — while shared and
  bookmarked links stay clean `/app/<slug>` (or `/`). Incoming legacy `?q=` links
  are stripped from the URL on load via a `stripSearchParams` search middleware.

## 0.4.0-alpha-20260805143647

### Patch Changes

- [#63](https://github.com/lislon/app-catalog/pull/63) [`98da849`](https://github.com/lislon/app-catalog/commit/98da8491b36920676f2f47361807446347af86fc) Thanks [@lislon](https://github.com/lislon)! - Fix stray `0` appearing in the catalog grid when a search matches no apps. The
  numeric `&&`-gated "Clear filters" row now uses `(totalAppsCount ?? 0) > apps.length`
  so it can never render a bare number as a React text node.

## 0.4.0-alpha-20260804214537

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260804172958

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260804161437

### Patch Changes

- [#53](https://github.com/lislon/app-catalog/pull/53) [`7d93441`](https://github.com/lislon/app-catalog/commit/7d93441a5b23bcc8036cf6d6c2b4c63753b2fccf) Thanks [@lislon](https://github.com/lislon)! - Render internal cross-reference links in catalog markdown as in-app router
  navigation. A relative `[Name](/app/<slug>)` link in a description/comment now
  navigates within the catalog via the TanStack router (same tab, no full
  reload) instead of opening a new browser tab, so entries can cross-link each
  other with plain markdown (#25). The slug is validated against the loaded
  resources (canonical slug or a known alias) — an unknown slug renders as plain
  text rather than a dead link, and the link gets `aria-current="page"` when it
  points at the currently open app. External http/https links are unchanged
  (still open in a new tab with `noopener noreferrer`).

## 0.4.0-alpha-20260731185816

### Patch Changes

- [#50](https://github.com/lislon/app-catalog/pull/50) [`9ea8776`](https://github.com/lislon/app-catalog/commit/9ea8776668ae5021378a8f2cdf3f9c935f153223) Thanks [@lislon](https://github.com/lislon)! - Keep the header "Apps" tab active while viewing an app-detail route
  (`/app/<slug>`). Previously the toggle used an exact match on `/`, so on
  `/app/<slug>` neither "Apps" nor "Service Desks" was highlighted (#23). The
  active segment is now derived from the current pathname.

## 0.4.0-alpha-20260730182101

### Minor Changes

- [#47](https://github.com/lislon/app-catalog/pull/47) [`7c22d5d`](https://github.com/lislon/app-catalog/commit/7c22d5d7fddb2fb6f3d288397d92a889c888ea81) Thanks [@lislon](https://github.com/lislon)! - Backend-computed freshness on the app detail view. Each resource now carries a
  `freshness: { lastCheckedAt, isStale }` (derived server-side from the source
  scan's last-checked/next-check dates); the detail view renders a muted
  "Last checked …" line after Sources, with a subtle "· may be out of date" note
  when the entry is stale. The frontend does no date math.

### Patch Changes

- [#47](https://github.com/lislon/app-catalog/pull/47) [`7c22d5d`](https://github.com/lislon/app-catalog/commit/7c22d5d7fddb2fb6f3d288397d92a889c888ea81) Thanks [@lislon](https://github.com/lislon)! - Redirect `/app/<alias>` to the canonical `/app/<slug>`. When an app's slug
  changes, its old slug can be listed in `aliases[]`; visiting the old URL now
  redirects (client-side, replace) to the canonical app instead of showing a
  blank catalog.

## 0.4.0-alpha-20260730170821

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260729145918

### Patch Changes

- [#42](https://github.com/lislon/app-catalog/pull/42) [`eafd7a5`](https://github.com/lislon/app-catalog/commit/eafd7a5516bb2a901daa973de4753fa34a38722c) Thanks [@lislon](https://github.com/lislon)! - Service Desks view: autofocus the search input when the view loads, matching the
  Apps view. Switching to the Service Desks tab now places the cursor in the search
  box so users can type immediately.

## 0.4.0-alpha-20260729145014

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260729112817

### Minor Changes

- [#37](https://github.com/lislon/app-catalog/pull/37) [`b966cfc`](https://github.com/lislon/app-catalog/commit/b966cfccd3dc2ec8a9e76afe10c0ff6d31c70485) Thanks [@lislon](https://github.com/lislon)! - Service Desks view: show an optional description as muted subtext under each
  service desk's name. Adds an optional `description` field to the service
  approval-method config (`ServiceConfig.description`); the Service Desks table
  renders it beneath the name when present.

## 0.4.0-alpha-20260728193854

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260728181436

### Minor Changes

- [#31](https://github.com/lislon/app-catalog/pull/31) [`25ee63c`](https://github.com/lislon/app-catalog/commit/25ee63c4515e1962ff1cb44a2dba7a8207943c87) Thanks [@lislon](https://github.com/lislon)! - Add a "Service Desks" view. A compact "Apps | Service Desks" segmented toggle in
  the header (no added height) switches between the app catalog (/) and a new
  /service-desks route. The Service Desks page lists all service-desk approval
  methods (type 'service') in a searchable table, each with a link that opens its
  portal in a new tab. Data rides in on the existing app-catalog query — no
  backend change.

## 0.4.0-alpha-20260728153301

### Patch Changes

- [#28](https://github.com/lislon/app-catalog/pull/28) [`3495bc0`](https://github.com/lislon/app-catalog/commit/3495bc04d14653ccfbf470d17d017c455318b125) Thanks [@lislon](https://github.com/lislon)! - Fix the deprecated-app "View replacement" link (and deep links) rendering a
  blank panel. Navigating to /app/<slug> now resolves the open app from the full
  resource set, and the catalog renders the detail panel even when the current
  search/filters would otherwise show an empty state. Previously the panel
  resolved the open app only from the filtered list, so a replacement (or any
  deep-linked app) not matching the active search changed the URL but showed
  nothing. "Hard navigation" now behaves like typing the URL in the browser.

## 0.4.0-alpha-20260728040254

### Patch Changes

- [#25](https://github.com/lislon/app-catalog/pull/25) [`5e2b1e7`](https://github.com/lislon/app-catalog/commit/5e2b1e7229a9d207c07298ee792777f8e18e759c) Thanks [@lislon](https://github.com/lislon)! - Search now falls back to deprecated apps when there are no active matches. If a
  search query returns zero non-deprecated results but deprecated apps match, the
  catalog shows those deprecated matches, displays a "showing deprecated matches"
  notice, and auto-enables the "Show Deprecated Apps" toggle so the state is
  visible and consistent. When the query has active matches, deprecated apps stay
  hidden as before; when nothing matches at all, the normal empty state shows.

## 0.4.0-alpha-20260727205627

### Patch Changes

- [#22](https://github.com/lislon/app-catalog/pull/22) [`d369f89`](https://github.com/lislon/app-catalog/commit/d369f8936d859698bd1404ba924fb11d33987e80) Thanks [@lislon](https://github.com/lislon)! - Fix the app detail route (`/app/$slug`) stripping the `q` search param. The
  route had no `validateSearch` schema, so TanStack Router dropped unknown params
  on navigation — including the URL-synced search query. That defeated the #10
  fix in the real router: `q` never survived the auto-navigation, so the search
  input still cleared. Added a `validateSearch` schema declaring `q` and the other
  URL-synced filter params (`filterTag`, `recent`, `filters`, `deprecated`).

## 0.4.0-alpha-20260727202703

### Patch Changes

- [#21](https://github.com/lislon/app-catalog/pull/21) [`5b3bb2b`](https://github.com/lislon/app-catalog/commit/5b3bb2b034fa2a8c22660bf129dd93ed7113f246) Thanks [@lislon](https://github.com/lislon)! - Fix the search input still resetting when typing into an empty search and the
  query narrows to a single app. The auto-navigate effect runs before the filters
  provider's async state→URL sync, so at navigation time the URL did not yet hold
  the `q` param and it was carried through as empty. The current search value is
  now injected directly into the auto-navigation's search params, so the typed
  query lands in the URL and the input stays populated across the route change.

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
