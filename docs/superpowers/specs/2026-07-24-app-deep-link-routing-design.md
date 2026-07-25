# App Deep-Link Routing Design (`/app/<slug>`)

**Date:** 2026-07-24
**Status:** Approved
**Repo:** app-catalog (open source, `packages/frontend-core`)
**Issue:** eng/informatics/sra/ig-umbrella#3

## Goal

Make an individual app shareable via a clean path URL. Selecting an app in the
catalog navigates to `/app/<slug>`; opening that URL loads the full catalog with
that app's detail panel open. Replaces the current `?app=<slug>` query param
(which stayed on `/` and wasn't obviously shareable).

## Current state

- The catalog renders `AppCatalogPage` inside `AppCatalogLayout` at two routes:
  `routes/_layout/index.tsx` (`/`) and `routes/_layout/catalog.apps.index.tsx`
  (`/catalog/apps/`). Both declare `app` as a search param via zod `validateSearch`.
- `AppCatalogPage` tracks the open app with
  `useUrlSyncedState({ key: 'app', defaultValue: undefined })` — bidirectional sync
  to `?app=<slug>` using `replace: true` (no history entries).
- The live detail panel is rendered by `AppCatalogGrid` (not the dead, now-removed
  `AppDetailModal`).

## Decisions (from brainstorming)

1. **Deep-link UX:** full catalog + selected app open (same model as today, prettier URL).
2. **Route shape:** new `/app/$slug` at root level. Catalog stays at `/`.
3. **Old `?app=` URLs:** support dropped — `?app=` is ignored; only `/app/<slug>` works.
4. **History:** **push** — each selected app is a browser-history entry (Back steps
   through previously-viewed apps). Changed from today's `replace`.
5. **Invalid slug:** `/app/<unknown>` renders the catalog with nothing selected
   (graceful no-op, matches old silent behavior). No hard 404.

## Architecture

**New route** `routes/_layout/app.$slug.tsx`:

- Renders the same `AppCatalogLayout` + `AppCatalogPage` as the index route (no new
  layout, no duplicated UI).
- Reads the `$slug` path param and passes it to `AppCatalogPage` as the selected app.
- Reuses the index route's loader (`appCatalogRouteLoader`).

**`AppCatalogPage`** (`modules/appCatalog/ui/pages/AppCatalogPage.tsx`):

- Stops using `useUrlSyncedState({ key: 'app' })` for the selected app.
- Receives the selected slug from the route (prop / route param). When rendered at
  `/` there is no slug (nothing open); at `/app/$slug` the slug is set.
- Selection handler: `navigate({ to: '/app/$slug', params: { slug } })` — **push**.
- Deselect / close detail: `navigate({ to: '/' })`.
- `filterTag` and search (`q`) params are unaffected — they remain search params.

**Index route `/`** (`routes/_layout/index.tsx`):

- Remove `app` from its `validateSearch` zod schema (drop `?app=`). Keep `filterTag`.
- Renders catalog with nothing open.

**`useUrlSyncedState`**: still used for other URL-synced state (filters, recent
mode). Only the `app` key usage is removed. The hook itself is unchanged.

## Components & boundaries

- `app.$slug.tsx` — route: path param → selected slug. Depends on AppCatalogLayout/Page.
- `AppCatalogPage` — owns selection→navigation. Input: optional selected slug (route).
  Output: navigation intents. No longer owns URL-sync for the app selection.
- `AppCatalogGrid` — unchanged; receives `selectedAppSlug` + a select callback as today.

## Edge cases & error handling

- **Unknown slug** (`/app/does-not-exist`): resolve slug against loaded resources; if
  not found, render catalog with no selection. No crash, no 404 page.
- **Deselect**: navigating to `/` clears selection.
- **`/catalog/apps/` route**: left as-is this pass (still has `app` search param).
  Aligning/removing it is a separate concern, not in scope.

## Testing

- Navigating to `/app/testrail` selects testrail (detail open) with full catalog present.
- Selecting an app in the grid changes the URL to `/app/<slug>` (push — new history entry).
- Closing the detail navigates to `/` and clears selection.
- `/app/<unknown-slug>` renders the catalog without crashing and with nothing selected.
- Back button steps through previously-opened apps.

## Out of scope (planned follow-up, separate spec)

- **Screenshot deep-links** `/app/<slug>/screenshots/<index>` — deep-link a specific
  screenshot in the gallery. Deferred until this base functionality is shipped and
  tested. The chosen `/app/$slug` root route is designed to accept
  `screenshots/$index` as a child route later.
- No redirect from legacy `?app=`.
- No standalone (grid-less) app page.
