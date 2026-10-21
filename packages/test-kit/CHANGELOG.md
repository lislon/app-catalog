# @igstack/app-catalog-test-kit

## 6.10.2

### Patch Changes

- [#332](https://github.com/lislon/app-catalog/pull/332) [`0ffac12`](https://github.com/lislon/app-catalog/commit/0ffac12a459c2c645f2d0a21e8236280638d5151) Thanks [@lislon](https://github.com/lislon)! - The detail card's chunk now loads after the catalog's first paint, so the first click on a row opens the card without waiting for it. The test kit loads the same chunk before it mounts the app, and it exports its wait budgets from `@igstack/app-catalog-test-kit/timeouts`. Every wait inside a step is shorter than the step, so a failure shows the wait's own error.

  `PwaAutoUpdateProvider` keeps one controller while the service worker registration arrives and when the host passes a new options object with the same values. Rebuilding the controller cancelled a pending visibility check.

- Updated dependencies [[`0ffac12`](https://github.com/lislon/app-catalog/commit/0ffac12a459c2c645f2d0a21e8236280638d5151)]:
  - @igstack/app-catalog-frontend-core@6.10.2
  - @igstack/app-catalog-backend-core@6.10.2

## 6.10.1

### Patch Changes

- Updated dependencies [[`0036b55`](https://github.com/lislon/app-catalog/commit/0036b551831020698873a8d441ddbbc1dcce15e8)]:
  - @igstack/app-catalog-frontend-core@6.10.1
  - @igstack/app-catalog-backend-core@6.10.1

## 6.10.0

### Minor Changes

- [#330](https://github.com/lislon/app-catalog/pull/330) [`16d5181`](https://github.com/lislon/app-catalog/commit/16d51817a4d6cb37d4a968c21a734d9fba39c162) Thanks [@lislon](https://github.com/lislon)! - Entries carry claims: plain statements with a date, an origin, and a status (active, in review, or archived with a reason). They are stored, synced and shown on a new "Behind this card" tab (id `behind`; old `?tab=notes` links land there), which also holds visitor notes, the sources with their dates, and the AI prompt and memory. Documentation keeps only the documentation links and Background, and is hidden when an entry has neither. A "Share what you know" button at the right of the tab strip opens Behind this card and focuses its inline input ("Add a fact, a fix or a question — press Enter"), which also takes screenshots by paperclip, paste or drop; a screenshot alone is a valid note, and Send stays visible, disabled until there is something to send. Under the input, a "Comments" heading with a "How comments work" help popover, then one feed, newest first, with one entry per visitor note: a small who-and-when line above the words, a "Pending" or "Used as source" badge derived from the note and the claim made from it, the maintainer's reply under it, and claims that have no note of their own shown in their own words. Archived claims are not shown. The tab's count is the number of Pending entries. The help popover ends with a line on what happens next; a deployment can replace it via the `resourceDetailFeedbackNote` plugin slot, and can add a link to the card's own source via the new `resourceDetailCardSource` slot. The sources group is titled "Kept up to date from", with a "Last checked … · added …" line. Visitor feedback text is stripped of invisible characters before storage.

  Test-kit API changes: `AppDetailTools.feedback.isComposerOpen()` removed; `AppDetailTabId` type drops `'notes'` and adds `'behind'`; `feedback.open()` now presses "Share what you know"; `feedback.openCount()` counts the feed's Pending badges; cucumber steps "the composer is open" and "the composer is closed" replaced by "the caret is in the input", "the input is empty", and "there is nothing to send yet".

### Patch Changes

- Updated dependencies [[`16d5181`](https://github.com/lislon/app-catalog/commit/16d51817a4d6cb37d4a968c21a734d9fba39c162)]:
  - @igstack/app-catalog-backend-core@6.10.0
  - @igstack/app-catalog-frontend-core@6.10.0

## 6.9.0

### Patch Changes

- Updated dependencies [[`644795b`](https://github.com/lislon/app-catalog/commit/644795b2d0fcb20ad6df2c4458834443fe5a1500)]:
  - @igstack/app-catalog-frontend-core@6.9.0
  - @igstack/app-catalog-backend-core@6.9.0

## 6.8.4

### Patch Changes

- Updated dependencies [[`925a949`](https://github.com/lislon/app-catalog/commit/925a9494ed21b3c60e1a4982079554c317177176)]:
  - @igstack/app-catalog-frontend-core@6.8.4
  - @igstack/app-catalog-backend-core@6.8.4

## 6.8.3

### Patch Changes

- Updated dependencies [[`c27eedb`](https://github.com/lislon/app-catalog/commit/c27eedb544020c0aa1584f39092a6e996b5ebebb)]:
  - @igstack/app-catalog-frontend-core@6.8.3
  - @igstack/app-catalog-backend-core@6.8.3

## 6.8.2

### Patch Changes

- [#324](https://github.com/lislon/app-catalog/pull/324) [`edbfe7d`](https://github.com/lislon/app-catalog/commit/edbfe7d588e171e02430bec31ad091031979a1d8) Thanks [@lislon](https://github.com/lislon)! - Header shows the Login button to anonymous visitors again

  Signing in is now useful for more than an admin, so the header offers it again. The button
  opens the sign-in modal and returns the visitor to the page they were on. The `/login` route
  fix from the earlier change stays. DEV Login still appears only when the backend enables it.

- Updated dependencies [[`edbfe7d`](https://github.com/lislon/app-catalog/commit/edbfe7d588e171e02430bec31ad091031979a1d8)]:
  - @igstack/app-catalog-frontend-core@6.8.2
  - @igstack/app-catalog-backend-core@6.8.2

## 6.8.1

### Patch Changes

- Updated dependencies [[`e850b17`](https://github.com/lislon/app-catalog/commit/e850b173b27ae74c0935d72db50359d1ad036fa2)]:
  - @igstack/app-catalog-frontend-core@6.8.1
  - @igstack/app-catalog-backend-core@6.8.1

## 6.8.0

### Patch Changes

- Updated dependencies [[`23f71ea`](https://github.com/lislon/app-catalog/commit/23f71eafc97012101c37c2939800b95f7a515851)]:
  - @igstack/app-catalog-frontend-core@6.8.0
  - @igstack/app-catalog-backend-core@6.8.0

## 6.7.0

### Minor Changes

- [#319](https://github.com/lislon/app-catalog/pull/319) [`1efa546`](https://github.com/lislon/app-catalog/commit/1efa5464f72e2f7f46e8a14f7739f1efb76576b4) Thanks [@lislon](https://github.com/lislon)! - Use `childrenLabel` for the sub-resources panel, not only for the tab.

  A parent resource can already name its children with `childrenLabel`, and the
  detail tab has always honoured it. The panel the tab opens did not: its heading
  and its filter placeholder were hard-coded, so naming the children renamed the
  tab and left the heading underneath contradicting the tab the user had just
  clicked. Both now follow the same field.

  A catalog that sets no `childrenLabel` renders exactly as before. The two
  fallbacks stay as they were and are deliberately different — the heading reads
  "Sub-Resources" and the placeholder "resources" — because making them agree
  would change wording in every existing deployment. The label is also used
  verbatim rather than lower-cased, so an acronym survives.

  The heading now carries `data-testid="sub-resources-heading"`, and the test
  kit's `getSubResources()` locates it by that instead of by matching the literal
  text "Sub-Resources (n of m)". The old selector returned `null` for any catalog
  that named its children, which read as "this resource has no children" rather
  than as a broken selector.

- [#319](https://github.com/lislon/app-catalog/pull/319) [`aafaca8`](https://github.com/lislon/app-catalog/commit/aafaca8091687fe26b228ac167d52a0c2a17a052) Thanks [@lislon](https://github.com/lislon)! - Let a consuming app own the route tree, so it can compose the core's routes with
  its own and serve any URL it likes — including top-level paths the core has never
  heard of — with full type safety over the merged tree.

  The obstacle was a single TypeScript fact: TanStack's type safety comes from a
  global `declare module … Register` augmentation, exactly one of which may exist
  per program, and a type-only reference still drags it in. (Verified for
  `import type`, inline `{ type T }`, `ReturnType<typeof fn>`, a barrel re-export
  and `await import()`; augmentations are collected when the program is built and
  elision is emit-only.) The core's `Register` therefore reached every consumer,
  and no consumer could declare its own.

  Three changes follow from that:
  - **`createAcRouter` now lives on its own subpath, `/router`.** It is the only
    published door to the core's `Register` and route tree. Import it if you use
    the core's tree unchanged — the example app and the core's own suites do. An
    app that composes its own tree must not, and nothing on the main entry
    references it.
  - **`AppProps.router` is `RegisteredRouter`** rather than a concrete router
    type. It resolves per program against whatever `Register` that program
    declared, and widens nothing: a router built from a different tree is still
    rejected.
  - **`appPropsFactory` takes `createRouter`.** The route tree belongs to the
    consumer, so the factory can no longer build the router itself. Using the
    core's tree unchanged? Pass `createAcRouter` from
    `@igstack/app-catalog-frontend-core/router`.

  A route the consumer places inside the core's pathless `_layout` can opt into
  the catalog layout, and therefore its providers, by declaring
  `staticData: { acCatalogLayout: true }`. Without it such a route renders bare
  and the first hook that needs the catalog throws, since the core cannot know a
  route it has never seen wants its providers. The opt-in also tells the layout
  which entry the route belongs to, so a consumer's route under `/app/$slug/...`
  opens the card for that entry instead of dropping the user on the index.

  Adds `useCatalogResources()` — `{ resources, isLoading }` — for resolving path
  params against the catalog, deliberately narrower than the full context. Use the
  loading flag to tell "still fetching" from "no such resource": a deep link
  renders before the catalog arrives, and treating that as a bad link redirects
  away from every valid one.

  In the test kit, the harness cannot import a route tree for the same reason, so
  it takes a router factory by registration: call `setRouterFactory()` from a
  vitest setup file. Registration rather than a required `given()` option, so no
  existing call site changes; `given()` also accepts `createRouter` directly.

  Two fixes found along the way: the `/router` subpath was emitting types with no
  JavaScript, and the default error component crashed on a non-`Error` throw.

- [#319](https://github.com/lislon/app-catalog/pull/319) [`4694c77`](https://github.com/lislon/app-catalog/commit/4694c77d543281e61c03f695dbef3a4d180a4822) Thanks [@lislon](https://github.com/lislon)! - Add plugin slots, so a consuming app can render its own UI at points the core
  declares without the core knowing anything about it.

  Pass an array of plugins to `<App extensions={[...]} />`. Each contributes
  `slots` (rendered at a point, several plugins may share one) and/or `wrappers`
  (rendered around a subtree, so a plugin can supply context). The prop is
  optional: with no plugins registered every slot renders nothing and every
  wrapper passes its children through, so existing behaviour is unchanged.

  Handlers are typed from a single per-feature spec, so registering an unknown
  slot or reading a field a slot does not pass is a compile error.

  Each contribution is isolated behind its own error boundary and `Suspense`: a
  plugin that throws or suspends cannot take down the host or its peers. The two
  fallbacks differ by design — a leaf slot falls back to nothing, so its region is
  simply absent, while a wrapper falls back to the children it was wrapping, since
  a wrapper only decorates and must never blank the subtree underneath it.

  `useSlotFilled(slot)` reports whether any plugin fills a slot, for the cases
  where the core has to change its own layout around one rather than just render
  it — a table column, whose header would otherwise sit above no cells in a build
  that registers nothing. `usePluginUser()` projects the signed-in user into the
  shape slots receive, in one place, and returns `null` with no auth provider
  above it.

  `given()` in the test kit now accepts `extensions`, so a plugin can be mounted
  in tests exactly as it ships. `registerCatalog()` takes them too, as an optional
  third argument, so Gherkin scenarios exercise the app as it is actually built
  without a `.feature` file having to name any plugin.

  Also adds `useOptionalUser`, which returns `null` rather than throwing when
  there is no `AuthProvider` above it.

### Patch Changes

- Updated dependencies [[`1efa546`](https://github.com/lislon/app-catalog/commit/1efa5464f72e2f7f46e8a14f7739f1efb76576b4), [`4072068`](https://github.com/lislon/app-catalog/commit/40720683e859c83bdd28b019501a5873a83c38be), [`aafaca8`](https://github.com/lislon/app-catalog/commit/aafaca8091687fe26b228ac167d52a0c2a17a052), [`0fd465b`](https://github.com/lislon/app-catalog/commit/0fd465b184b81e52d093e58a7a11bc676ee68304), [`6baa128`](https://github.com/lislon/app-catalog/commit/6baa1283d8672664ca20752ba42864433961958d), [`4694c77`](https://github.com/lislon/app-catalog/commit/4694c77d543281e61c03f695dbef3a4d180a4822), [`1efa546`](https://github.com/lislon/app-catalog/commit/1efa5464f72e2f7f46e8a14f7739f1efb76576b4), [`fd357cc`](https://github.com/lislon/app-catalog/commit/fd357cc029e49272bdde3d8f562b02b77cb76ee5)]:
  - @igstack/app-catalog-frontend-core@6.7.0
  - @igstack/app-catalog-backend-core@6.7.0

## 6.6.0

### Minor Changes

- [#318](https://github.com/lislon/app-catalog/pull/318) [`a46f5ab`](https://github.com/lislon/app-catalog/commit/a46f5abba79f1b40c49f3f7ab697b565285d99cd) Thanks [@lislon](https://github.com/lislon)! - Access tab shows admin notes again, at both levels

  Two readers open an entry's access tab: one wants in, the other has to let them
  in. For many entries the only written record of HOW a role is granted -- the
  directory group, the pipeline to run -- lives in admin notes, and neither level
  of them was rendered, so the second reader got a page with nothing on it for
  them and no second page to go to.
  - `Role.adminNotes` is back as a `Note:` line under the role's description in
    the Available Roles table. A role with no description still gets the em-dash,
    so the note can never read as the description.
  - The entry's own `adminNotes` -- served as `Resource.notes`, stored and synced
    but rendered nowhere until now -- gets its own "Admin notes" block after the
    roles table, and also renders on an entry that has no access request at all,
    where it is the only thing on the page that says how access is granted.

  Both levels are guarded by a Cucumber feature in the test kit
  (`accessAdminNotes.feature`), whose fixture now carries roles with group names
  and an entry-level note.

### Patch Changes

- Updated dependencies [[`a46f5ab`](https://github.com/lislon/app-catalog/commit/a46f5abba79f1b40c49f3f7ab697b565285d99cd)]:
  - @igstack/app-catalog-frontend-core@6.6.0
  - @igstack/app-catalog-backend-core@6.6.0

## 6.5.2

### Patch Changes

- Updated dependencies [[`0fe507e`](https://github.com/lislon/app-catalog/commit/0fe507e24f3965c3576f723d6786c2989e88d010)]:
  - @igstack/app-catalog-frontend-core@6.5.2
  - @igstack/app-catalog-backend-core@6.5.2

## 6.5.1

### Patch Changes

- Updated dependencies [[`2fea9e8`](https://github.com/lislon/app-catalog/commit/2fea9e8992366fa808168ad80f05544930942f63)]:
  - @igstack/app-catalog-frontend-core@6.5.1
  - @igstack/app-catalog-backend-core@6.5.1

## 6.5.0

### Patch Changes

- Updated dependencies [[`d5c8ab6`](https://github.com/lislon/app-catalog/commit/d5c8ab6de557b76f555ba7d74035bef479a231dc)]:
  - @igstack/app-catalog-frontend-core@6.5.0
  - @igstack/app-catalog-backend-core@6.5.0

## 6.4.0

### Minor Changes

- [#313](https://github.com/lislon/app-catalog/pull/313) [`3cfb822`](https://github.com/lislon/app-catalog/commit/3cfb822844c4b9bc750d284ef4d51edd62502330) Thanks [@lislon](https://github.com/lislon)! - Let anyone browsing an entry request a correction from the entry itself — free text,
  optional images — and see what happened to what they asked.

  The detail card gains a notes tab listing what was asked and what was applied. The author
  may edit their wording for an hour and withdraw it until someone has reviewed it, both
  enforced server-side: the control disappearing is a courtesy, a request arriving a second
  late is still refused.

  `DbComment` becomes `DbFeedback` plus `DbFeedbackAttachment`, migrating existing rows and
  preserving their ids, review status and replies. Visitor identity moves out of the
  comments module and becomes a shared actor, so the same pseudonym can serve anything else
  that needs one.

  Attachments are deliberately not assets: that table's name is unique and holds published
  artwork, so a passing visitor's upload has no business sharing its namespace. Every upload
  is decoded and re-encoded before storage, which is what drops EXIF, trailing data and
  anything polyglot — and decoding is also the format check, so a text file announcing
  itself as an image is refused and a valid SVG carrying a script is rasterised with no
  script surviving. An image is claimed on submit by its uploader only, and anything never
  submitted is swept.

### Patch Changes

- Updated dependencies [[`3cfb822`](https://github.com/lislon/app-catalog/commit/3cfb822844c4b9bc750d284ef4d51edd62502330)]:
  - @igstack/app-catalog-backend-core@6.4.0
  - @igstack/app-catalog-frontend-core@6.4.0

## 6.3.0

### Patch Changes

- Updated dependencies [[`4b7fab9`](https://github.com/lislon/app-catalog/commit/4b7fab9bd4a721f7f726c01d55cb972505e5332c), [`bc8ebc0`](https://github.com/lislon/app-catalog/commit/bc8ebc0d927306a363791ec55bfa2d5cb52ef79b), [`ff1b865`](https://github.com/lislon/app-catalog/commit/ff1b865ee95f29d19f5678074ca32c13381b5b16), [`ff1b865`](https://github.com/lislon/app-catalog/commit/ff1b865ee95f29d19f5678074ca32c13381b5b16), [`746cb8b`](https://github.com/lislon/app-catalog/commit/746cb8b8ea315692017815bdc6de92738f70f6b0), [`c91e417`](https://github.com/lislon/app-catalog/commit/c91e4176f3f99e59dfac25c64c1ee18d6efe53ba), [`4d92d5f`](https://github.com/lislon/app-catalog/commit/4d92d5f80aa5a34fa5082f4208e35c1dff0325f1), [`b65bb01`](https://github.com/lislon/app-catalog/commit/b65bb01746c4172f6afacb6c7f135a6d9854e84f)]:
  - @igstack/app-catalog-frontend-core@6.3.0
  - @igstack/app-catalog-backend-core@6.3.0

## 6.2.2

### Patch Changes

- Updated dependencies [[`26bd122`](https://github.com/lislon/app-catalog/commit/26bd122103d2747f951a6bb0938c977f17391904)]:
  - @igstack/app-catalog-frontend-core@6.2.2
  - @igstack/app-catalog-backend-core@6.2.2

## 6.2.1

### Patch Changes

- Updated dependencies [[`1032057`](https://github.com/lislon/app-catalog/commit/1032057ee18d8dcd7b8713dc8878df925158cd38)]:
  - @igstack/app-catalog-frontend-core@6.2.1
  - @igstack/app-catalog-backend-core@6.2.1

## 6.2.0

### Patch Changes

- Updated dependencies [[`12c1343`](https://github.com/lislon/app-catalog/commit/12c1343ac9ca456e464834a9b73fc247e4a8e3aa)]:
  - @igstack/app-catalog-frontend-core@6.2.0
  - @igstack/app-catalog-backend-core@6.2.0

## 6.1.6

### Patch Changes

- Updated dependencies [[`f47da70`](https://github.com/lislon/app-catalog/commit/f47da707ea28b93a0e4c5e39102e84af13d69065), [`ee9f506`](https://github.com/lislon/app-catalog/commit/ee9f5067e350a0a35507fb982c5574f24b8c669f)]:
  - @igstack/app-catalog-backend-core@6.1.6
  - @igstack/app-catalog-frontend-core@6.1.6

## 6.1.5

### Patch Changes

- Updated dependencies [[`8c19cd1`](https://github.com/lislon/app-catalog/commit/8c19cd1f11eb1da3ccd07318e321c2e4ced2f509)]:
  - @igstack/app-catalog-frontend-core@6.1.5
  - @igstack/app-catalog-backend-core@6.1.5

## 6.1.4

### Patch Changes

- Updated dependencies [[`f79b46f`](https://github.com/lislon/app-catalog/commit/f79b46ff5607d9acfa54f8738dc73f9f7e2e36ec)]:
  - @igstack/app-catalog-frontend-core@6.1.4
  - @igstack/app-catalog-backend-core@6.1.4

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
