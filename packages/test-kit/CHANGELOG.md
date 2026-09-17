# @igstack/app-catalog-test-kit

## 3.0.0

### Patch Changes

- Updated dependencies [[`3708635`](https://github.com/lislon/app-catalog/commit/370863596a11304147d0b1aef51ef1010aa19399), [`c48994b`](https://github.com/lislon/app-catalog/commit/c48994bbc3bab81b94c07e564015bdc12b720a86)]:
  - @igstack/app-catalog-frontend-core@3.0.0
  - @igstack/app-catalog-backend-core@3.0.0

## 2.0.4

### Patch Changes

- [#206](https://github.com/lislon/app-catalog/pull/206) [`828ed33`](https://github.com/lislon/app-catalog/commit/828ed33935db79b30f3ccd8174af7da143b13f2c) Thanks [@lislon](https://github.com/lislon)! - Header no longer shows a Login button to anonymous visitors, and the login route renders again

  The catalog is fully browsable without signing in, so the header's "Login" button
  mostly advertised a flow most visitors have no reason to enter. The button is
  removed rather than hidden behind a flag: a permanently-false flag is dead code
  that the lint rules reject, and `git revert` of this commit brings the button back
  as it was.

  This is a visibility change only. The login modal, the auth client, session
  handling, route guards and the signed-in user menu (avatar and sign-out) are all
  untouched. `LoginModal` is still mounted app-wide by `TopLevelProviders`, so
  `useAuthModal().open()` still opens it from anywhere, and the header still switches
  to the user menu once a visitor signs in. `DEV Login` is unchanged and still
  appears when the backend reports `devLoginEnabled`.

  The wrapper `div` that held the two anonymous-state buttons is gone along with the
  button: as an empty flex child it would still have consumed the header row's
  `gap-3`, leaving a visible gap where the button used to be.

  The `/login` route now renders `LoginPage` directly instead of `LoginModal`. The
  modal only renders while `AuthModalContext` reports itself open, and nothing opens
  it when the route is entered by URL, so the route rendered a blank page. With the
  header button gone the route is the URL-reachable entry to the flow, so it has to
  render on its own.

- Updated dependencies [[`828ed33`](https://github.com/lislon/app-catalog/commit/828ed33935db79b30f3ccd8174af7da143b13f2c)]:
  - @igstack/app-catalog-frontend-core@2.0.4
  - @igstack/app-catalog-backend-core@2.0.4

## 2.0.3

### Patch Changes

- Updated dependencies [[`f62753c`](https://github.com/lislon/app-catalog/commit/f62753c80043c327eb01c3c2f23a8b64456ea90f)]:
  - @igstack/app-catalog-frontend-core@2.0.3
  - @igstack/app-catalog-backend-core@2.0.3

## 2.0.2

### Patch Changes

- Updated dependencies [[`8bc5583`](https://github.com/lislon/app-catalog/commit/8bc5583af9939dc112b9c4cc1cc4dc90e0d9f3db)]:
  - @igstack/app-catalog-frontend-core@2.0.2
  - @igstack/app-catalog-backend-core@2.0.2

## 2.0.1

### Patch Changes

- Updated dependencies [[`fcf46e8`](https://github.com/lislon/app-catalog/commit/fcf46e80cbb5803de1485d14fb0241bba9e041fd)]:
  - @igstack/app-catalog-frontend-core@2.0.1
  - @igstack/app-catalog-backend-core@2.0.1

## 2.0.0

### Patch Changes

- Updated dependencies [[`98e6cc7`](https://github.com/lislon/app-catalog/commit/98e6cc77ef262847891982b4afbd74e23f4ef038), [`ce99b1b`](https://github.com/lislon/app-catalog/commit/ce99b1bc970f7d70497ce0eda46dbd41f5a9c248), [`47f5a9a`](https://github.com/lislon/app-catalog/commit/47f5a9aecd20722cb48d199a44413d048b3de431)]:
  - @igstack/app-catalog-backend-core@2.0.0
  - @igstack/app-catalog-frontend-core@2.0.0

## 1.0.1

### Patch Changes

- Updated dependencies [[`2223ce0`](https://github.com/lislon/app-catalog/commit/2223ce0dbeed8d5b0fa642275975c9ccdf975b4b)]:
  - @igstack/app-catalog-frontend-core@1.0.1
  - @igstack/app-catalog-backend-core@1.0.1

## 1.0.0

### Minor Changes

- [#183](https://github.com/lislon/app-catalog/pull/183) [`6fc2b39`](https://github.com/lislon/app-catalog/commit/6fc2b3910208811c58ab3d5897be816adc562c30) Thanks [@lislon](https://github.com/lislon)! - Remove the unreachable legacy grid catalog view

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

- [#182](https://github.com/lislon/app-catalog/pull/182) [`525ffc0`](https://github.com/lislon/app-catalog/commit/525ffc0959e05a6b03d0fe21b342eb278ddb3394) Thanks [@lislon](https://github.com/lislon)! - Opening a sub-resource from search results now lands on it

  Clicking a matched sub-resource used to open its parent with all siblings listed,
  so a query matching 47 accounts buried the one row that was clicked. Two states
  now exist: `?sub=<slug>` shows the parent with its table singled out to that
  child, and `/app/<slug>/sub/<child>` is the child's own page with its two-step
  access chain. Sub-resource rows in the parent's table are real links, and the
  result counter now counts matched sub-resources instead of reporting a parent
  found through 47 matching children as "1 result".

  A sub-resource that documents access through approvers/comments rather than an
  approval method now renders its access section instead of nothing.

  The search box no longer restores a query from a previous page load.

  The test kit gains a Cucumber layer: `@igstack/app-catalog-test-kit/cucumber`
  provides step definitions over the existing `given()` harness, so `.feature`
  files can drive the real app in jsdom. Register a fixture with
  `registerCatalog(name, magazine)` and reference it from
  `Given the "<name>" catalog`.

### Patch Changes

- [#180](https://github.com/lislon/app-catalog/pull/180) [`3a46ab6`](https://github.com/lislon/app-catalog/commit/3a46ab6999e2de623202d3faac883b80481d5b1c) Thanks [@lislon](https://github.com/lislon)! - New package: the integration test harness (mock backend, mock network, page
  objects) is now published so downstream apps can run the same scenarios against
  their own catalog data.
- Updated dependencies [[`3e0681b`](https://github.com/lislon/app-catalog/commit/3e0681be536d3dd19c6e1476ae727bdb77398014), [`16ed741`](https://github.com/lislon/app-catalog/commit/16ed741d722d05e150d1a6fb8d468fbaf702e3a4), [`a7b251e`](https://github.com/lislon/app-catalog/commit/a7b251e83d8f297f1a3746ae69d5170720d00a83), [`6fc2b39`](https://github.com/lislon/app-catalog/commit/6fc2b3910208811c58ab3d5897be816adc562c30), [`525ffc0`](https://github.com/lislon/app-catalog/commit/525ffc0959e05a6b03d0fe21b342eb278ddb3394)]:
  - @igstack/app-catalog-frontend-core@1.0.0
  - @igstack/app-catalog-backend-core@1.0.0
