# @igstack/app-catalog-test-kit

## 6.1.3

### Patch Changes

- Updated dependencies [[`7dc0c6f`](https://github.com/lislon/app-catalog/commit/7dc0c6fdfdf026897e2525b7b1612df3148194b0)]:
  - @igstack/app-catalog-frontend-core@6.1.3
  - @igstack/app-catalog-backend-core@6.1.3

## 6.1.2

### Patch Changes

- Updated dependencies [[`ad5aa81`](https://github.com/lislon/app-catalog/commit/ad5aa811599919bb0b679affe87e5d35c338fb5d)]:
  - @igstack/app-catalog-backend-core@6.1.2
  - @igstack/app-catalog-frontend-core@6.1.2

## 6.1.1

### Patch Changes

- Updated dependencies [[`e1a98b1`](https://github.com/lislon/app-catalog/commit/e1a98b1caea40cfd4b7c1b0f16d7311604e0b477)]:
  - @igstack/app-catalog-frontend-core@6.1.1
  - @igstack/app-catalog-backend-core@6.1.1

## 6.1.0

### Patch Changes

- Updated dependencies [[`21630f1`](https://github.com/lislon/app-catalog/commit/21630f1f7af88ac2a67ba20a5917a461b708386a), [`718a460`](https://github.com/lislon/app-catalog/commit/718a4606bb8b5413e4b46f63320bedba53dcc266), [`a215dac`](https://github.com/lislon/app-catalog/commit/a215dacd5338c50e5ff3f5480dcb933be486cdc4), [`4291bc6`](https://github.com/lislon/app-catalog/commit/4291bc65a72662fc23c3b7a8afba1619de3fd8b0)]:
  - @igstack/app-catalog-frontend-core@6.1.0
  - @igstack/app-catalog-backend-core@6.1.0

## 6.0.0

### Patch Changes

- Updated dependencies [[`1cf922f`](https://github.com/lislon/app-catalog/commit/1cf922f1525561aee784882f857f5adceea569a3)]:
  - @igstack/app-catalog-frontend-core@6.0.0
  - @igstack/app-catalog-backend-core@6.0.0

## 5.0.2

### Patch Changes

- [#243](https://github.com/lislon/app-catalog/pull/243) [`06ccb63`](https://github.com/lislon/app-catalog/commit/06ccb63b3fb2e1a9c256da910f9e7ecf901c4101) Thanks [@lislon](https://github.com/lislon)! - The harness drains its record of unhandled requests even when teardown throws, so a failing cleanup can no longer carry one test's unhandled requests into the next test's report.

- [#242](https://github.com/lislon/app-catalog/pull/242) [`c4d7801`](https://github.com/lislon/app-catalog/commit/c4d780177b340ef5b70424a1e82d96f129f96f80) Thanks [@lislon](https://github.com/lislon)! - The harness stubs `window.scrollTo`, so the router's scroll restoration no longer prints `Error: Not implemented` on every navigation under jsdom, and the mock network answers `comments.list` with an empty list, so an opened resource renders its real empty state instead of a network error. A request the mock network has no handler for now fails the test that made it (listing the requests) instead of printing a warning; `takeUnhandledRequests()` exposes the record.

- Updated dependencies [[`a1f1b23`](https://github.com/lislon/app-catalog/commit/a1f1b238c79758447c81cdcdb569a6af7790062f), [`09c014d`](https://github.com/lislon/app-catalog/commit/09c014d88a7f77afe6e9d0a5d776351e7552295c)]:
  - @igstack/app-catalog-frontend-core@5.0.2
  - @igstack/app-catalog-backend-core@5.0.2

## 5.0.1

### Patch Changes

- Updated dependencies [[`4eb0a32`](https://github.com/lislon/app-catalog/commit/4eb0a3220f482edce93675cce156eac81ab0f7c1)]:
  - @igstack/app-catalog-backend-core@5.0.1
  - @igstack/app-catalog-frontend-core@5.0.1

## 5.0.0

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-backend-core@5.0.0
  - @igstack/app-catalog-frontend-core@5.0.0

## 4.0.0

### Patch Changes

- [#213](https://github.com/lislon/app-catalog/pull/213) [`83bdeed`](https://github.com/lislon/app-catalog/commit/83bdeed12d87e313a94879a153441944886d68c0) Thanks [@lislon](https://github.com/lislon)! - Quick Jump's hover tell now uses the grasshopper mark next to the green `JUMP`
  word, matching the mockup the section was designed against. It stood in as a
  lucide glyph, which read as a generic icon rather than as the one recognisable
  bit of the interaction.

  The test kit registers `vite-plugin-svgr` instead of mocking svg imports one at a
  time. The old setup only knew about a single file, so any component importing a
  new `?react` svg threw while rendering — which surfaced as the whole app panel
  failing to appear, several test files away from the actual cause.

- [#215](https://github.com/lislon/app-catalog/pull/215) [`dae2587`](https://github.com/lislon/app-catalog/commit/dae2587bf6544fcf259d4a7989ed86effac70e96) Thanks [@lislon](https://github.com/lislon)! - Quick Jump is one control on the app's header instead of a section of its own:
  `[ destination ▾ | id | Jump ]`, sitting next to the button that opens the app.
  The section underneath — a column of buttons per identifier, a pin, and a
  Configure popover for choosing which identifiers to show — is gone. It asked the
  reader to scan a grid before typing anything, and the thing they came to do
  (paste an id, land on the page) was three decisions deep.

  What the new shape decides for them: the destination is a picker, not a row of
  buttons, so the field and the action never move; `Jump` is the only thing that
  navigates; pressing it while the field is empty puts the caret in the field
  rather than doing nothing.

  The chosen destination now lives in the url as `?qj=<slug>`, derived from the
  jump's title (`Tracker — View case` → `tracker.view-case`), so "use this
  destination on this app" is a link you can send. A `?qj=` that names no jump of
  the open app is dropped rather than silently resolving to the first one.

  The app's own open button drops the word "Open": it shows the host name followed
  by the external-link glyph, which already says what pressing it does.

  Also fixed on the way past: the screenshot preview was a clickable `div`, so the
  gallery could not be opened from the keyboard. It is a labelled button now.

- [#216](https://github.com/lislon/app-catalog/pull/216) [`976e00f`](https://github.com/lislon/app-catalog/commit/976e00fd8993fa328581614a1f6f2346c500075a) Thanks [@lislon](https://github.com/lislon)! - Four corrections to the Quick Jump bar, all from watching it get used.

  **The buttons leap before the click, not after.** Both links open a new tab, and
  the new tab takes focus the same instant the click lands — so the crouch-and-hop
  keyframe that used to fire on click ran inside a backgrounded tab, and you only
  ever saw it when you came back. It is now a `:hover` lift and an `:active`
  crouch, which happen while you still have the page. The app's own button gets the
  same motion: both of them are leaving for the app.

  **The header breathes.** The row sat 0.25rem under the app title, close enough to
  read as part of it. Now 0.75rem.

  **Two labels per destination.** The picker shows the action alone
  (`Rerun report`); the full `Tracker — Rerun report` stays in the menu,
  where the choice between systems is actually being made. The picker is where that
  choice is already over, so it was spending its fixed width on a word you had just
  read.

  **The dormant Jump explains itself on hover** — a bubble whose tail points at the
  field rather than at the button under the cursor, and the field lights up at the
  same time. Hovering something that does nothing is a question; the answer has to
  be in the place the answer lives.

- [#217](https://github.com/lislon/app-catalog/pull/217) [`65f3938`](https://github.com/lislon/app-catalog/commit/65f393817cf995b379233642323d22c3c447078d) Thanks [@lislon](https://github.com/lislon)! - A design and accessibility review pass over the Quick Jump bar. Everything here
  was measured in a browser, not eyeballed.

  **The control fitted on a phone about as well as a piano fits in a lift.** At a
  390px viewport the three segments came to 505px inside a 218px panel — `Jump`,
  the only thing in the row that navigates, was entirely off-screen, and the page
  grew a horizontal scrollbar. Every segment was `flex: none` and the field had a
  fixed `size`, so nothing could give. Below `sm` the picker now takes its own
  line and the field shares the next one with Jump; from `sm` up nothing changes,
  so a swapped destination still cannot slide the field sideways.

  **The dormant Jump was not a control.** It was an `<a>` with no `href`, which
  cannot take focus — so "press it and it tells you where to type" was mouse-only,
  the hint's `:focus-visible` branch was dead code, and its `aria-disabled` sat on
  a node no screen reader could reach. It is a `<button>` now, and an `<a>` only
  once it has somewhere to go.

  **Two WCAG AA failures on the fill both buttons use.** `--primary` under
  `--primary-foreground` measures 3.8:1, and the usual `bg-primary/90` hover made
  it worse by fading the fill toward the card rather than darkening it — so the
  dormant Jump was _more_ legible than the armed one. Both buttons now darken the
  fill (4.9:1) and darken further on hover (6.4:1). The token itself still owes
  every other filled button in the app the same fix; that is a brand decision.

  **One focus ring for three focusable segments.** The shell ringed itself on
  `focus-within`, so tabbing picker → field → Jump looked identical at every stop.
  The shell's ring is the field's now; the picker and Jump outline themselves.

  **The leap moved the wrong thing.** It was hung on the whole 505px shell, so
  hovering Jump lifted the field you had just typed into. The shell no longer
  clips its segments, so Jump leaps on its own.

  Smaller, same pass: the caret sits next to the picker's label instead of 85px
  away at the far edge, where it read as the field's boundary; the picker and Jump
  match the field's type size instead of running a size below it; the dormant Jump
  is tinted toward the action instead of sharing the picker's grey, which had the
  row reading as two dropdowns around a field; the hairline between the two
  buttons is gone (it separated a solid pill from a recessed shell — nothing that
  could be confused — and dangled as an orphan once the row wrapped); and the
  armed title is the destination rather than the destination plus a URL the
  browser already shows in the status bar.

- Updated dependencies [[`12e2558`](https://github.com/lislon/app-catalog/commit/12e2558b8123d0ad9adcaccb86f4c9ab2571928b), [`566f4d8`](https://github.com/lislon/app-catalog/commit/566f4d88adfcd492e6ac4fe0ecccc88a94106f49), [`1e86c9e`](https://github.com/lislon/app-catalog/commit/1e86c9e0dbe819e81290d5b3c2f0ae7c576731e8), [`47e97c1`](https://github.com/lislon/app-catalog/commit/47e97c12338210221f4ff7dc88159336865f6c34), [`7ce435c`](https://github.com/lislon/app-catalog/commit/7ce435c48819d6562a073d9d6b9461c30a4ae05a), [`36f4c36`](https://github.com/lislon/app-catalog/commit/36f4c36ce40122cc638c8db248b3a1add9a9cda0), [`cadc4f7`](https://github.com/lislon/app-catalog/commit/cadc4f70eab46c585644ca7b08b0f71d37669d6d), [`a297e00`](https://github.com/lislon/app-catalog/commit/a297e008f756aa8b200884a84bcb43d999519546), [`ee3510f`](https://github.com/lislon/app-catalog/commit/ee3510f9a5aeb22245797ffa2650dc8b31d8e44d), [`2e00035`](https://github.com/lislon/app-catalog/commit/2e00035a66ffa54d07eecbaeb7d75feafa564582), [`83bdeed`](https://github.com/lislon/app-catalog/commit/83bdeed12d87e313a94879a153441944886d68c0), [`dae2587`](https://github.com/lislon/app-catalog/commit/dae2587bf6544fcf259d4a7989ed86effac70e96), [`976e00f`](https://github.com/lislon/app-catalog/commit/976e00fd8993fa328581614a1f6f2346c500075a), [`65f3938`](https://github.com/lislon/app-catalog/commit/65f393817cf995b379233642323d22c3c447078d), [`eaa0d66`](https://github.com/lislon/app-catalog/commit/eaa0d66a3366ba3e35fcf841f82726154b943fce), [`596b73a`](https://github.com/lislon/app-catalog/commit/596b73a7b9b4f71943ecf2431ac97e7092bb6f62), [`182f048`](https://github.com/lislon/app-catalog/commit/182f0480f7fa08cc665500bf036ce1465c2cfaeb), [`19b6a33`](https://github.com/lislon/app-catalog/commit/19b6a337dcda5176416be6325c06dfb4d60031d4)]:
  - @igstack/app-catalog-frontend-core@4.0.0
  - @igstack/app-catalog-backend-core@4.0.0

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
