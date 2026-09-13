---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Remove the unreachable legacy grid catalog view

The catalog had two implementations: the search-first shell everyone actually
sees, and an older table-and-filters grid that could only be reached by
hand-crafting a `?recent=1` or `?filters=` URL — the controls that set those
params rendered only inside the grid itself. The grid, its filter bar, category
combobox, grouping tabs and onboarding card are gone, along with the whole
search/filter pipeline in the catalog page that only fed them (the shell always
re-derived search itself).

Renames, since the surviving components no longer need "launcher" to
disambiguate them: `LauncherHome` is now `AppCatalogGrid` (and
`LauncherHomeProps` is `AppCatalogGridProps`), `LauncherDetailPanel` is
`AppDetailPanel`, and the rich app detail moved out of the old grid file into
its own module.

Removed exports: `AppCatalogTable`, `AppCatalogFiltersCard`,
`AppCatalogDisplayMode`, `AppCatalogScopeFilter`. The `filterPane.filterByTagPrefixes`
UI setting is now inert — the pane it configured no longer exists. The `recent`
and `filters` search params are no longer declared on the app routes.

Test kit: `isShowDeprecatedChecked()`, `isOnboardingVisible()` and
`getCatalogTable()` are removed from `CatalogTools` — there is no table or
onboarding card left to inspect.
