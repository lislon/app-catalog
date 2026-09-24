# @igstack/app-catalog-frontend-core

## 6.1.0

### Minor Changes

- [#259](https://github.com/lislon/app-catalog/pull/259) [`21630f1`](https://github.com/lislon/app-catalog/commit/21630f1f7af88ac2a67ba20a5917a461b708386a) Thanks [@lislon](https://github.com/lislon)! - Catalog text now renders as GitHub-flavoured markdown: bare URLs become clickable links (trailing punctuation stays outside), and tables and `~~strikethrough~~` render. A single `~` stays literal so "~5 min" is not struck through.

- [#261](https://github.com/lislon/app-catalog/pull/261) [`718a460`](https://github.com/lislon/app-catalog/commit/718a4606bb8b5413e4b46f63320bedba53dcc266) Thanks [@lislon](https://github.com/lislon)! - Collapse an access request's roles table after five roles behind a "Show all N roles" toggle.

### Patch Changes

- [#260](https://github.com/lislon/app-catalog/pull/260) [`a215dac`](https://github.com/lislon/app-catalog/commit/a215dacd5338c50e5ff3f5480dcb933be486cdc4) Thanks [@lislon](https://github.com/lislon)! - Show the access-request documentation links after the last step instead of inside the first one, since they cover the whole process.

- [#258](https://github.com/lislon/app-catalog/pull/258) [`4291bc6`](https://github.com/lislon/app-catalog/commit/4291bc65a72662fc23c3b7a8afba1619de3fd8b0) Thanks [@lislon](https://github.com/lislon)! - Remove the unused `slate` and `slate-react` dependencies. No editor uses them any more; they only pulled in a `slate-dom` whose peer range the declared `slate` did not satisfy.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@6.1.0

## 6.0.0

### Minor Changes

- [#249](https://github.com/lislon/app-catalog/pull/249) [`1cf922f`](https://github.com/lislon/app-catalog/commit/1cf922f1525561aee784882f857f5adceea569a3) Thanks [@lislon](https://github.com/lislon)! - Bare chat-channel mentions such as `#swaggerhub` in catalog text now render as
  links when the consuming app sets `UiSettings.chatChannelUrlTemplate` (for
  example `https://<workspace>.slack.com/channels/{name}`); without it they stay
  plain text. Existing links, link fragments, inline code and digits-only
  mentions are left alone. Access-request comments, request prompts and
  post-approval steps now render through the same markdown component as the
  description, so links behave identically in every text field.

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@6.0.0

## 5.0.2

### Patch Changes

- [#244](https://github.com/lislon/app-catalog/pull/244) [`a1f1b23`](https://github.com/lislon/app-catalog/commit/a1f1b238c79758447c81cdcdb569a6af7790062f) Thanks [@lislon](https://github.com/lislon)! - Pressing Enter right after typing a search query opens the first result. The first row is shown focused so it is clear what Enter will open; ↑↓ still move the focus and Esc still clears the search. Previously Enter did nothing until ↓ had been pressed once (#167).

- [#246](https://github.com/lislon/app-catalog/pull/246) [`09c014d`](https://github.com/lislon/app-catalog/commit/09c014d88a7f77afe6e9d0a5d776351e7552295c) Thanks [@lislon](https://github.com/lislon)! - Search: punctuated or one-letter queries (`c#`, `r&d`, `a b`) compare raw again instead of collapsing to a letter-only prefix that matched half the catalog; Enter on a focused result row or button no longer also opens the first result.

- Updated dependencies [[`b880a30`](https://github.com/lislon/app-catalog/commit/b880a303b0f593062e87184856e7589c8a2978d1), [`09c014d`](https://github.com/lislon/app-catalog/commit/09c014d88a7f77afe6e9d0a5d776351e7552295c)]:
  - @igstack/app-catalog-shared-core@5.0.2

## 5.0.1

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@5.0.1

## 5.0.0

### Patch Changes

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@5.0.0

## 4.0.0

### Major Changes

- [#211](https://github.com/lislon/app-catalog/pull/211) [`7ce435c`](https://github.com/lislon/app-catalog/commit/7ce435c48819d6562a073d9d6b9461c30a4ae05a) Thanks [@lislon](https://github.com/lislon)! - The day-to-day shelf is now an explicit, additive `placement:day-to-day` tag

  `groupByArea` used to read `universality:everyone` and, on a match, push the
  resource onto the "Day-to-day tools" shelf **instead of** its own category. That
  made two unrelated questions share one tag: _how many people use this_ and
  _where does it appear_. Answering the second one deleted the answer to the
  first — a resource on the shelf silently vanished from its category section, so
  a category could render without its best-known members (#132).

  The two concerns are now separate tags:
  - `universality:*` goes back to meaning reach only, and no longer affects layout
  - `placement:day-to-day` is opt-in placement, and it is **additive** — the
    resource is a shortcut at the top _and_ still listed under its category

  ### Breaking
  - `groupByArea(apps, dayToDayCategories?)` lost its second parameter:
    `groupByArea(apps)`. Shelf membership is per-resource data now, not UI config.
  - `AreasSettings.dayToDayCategories` is removed. Tag the resources you want on
    the shelf with `placement:day-to-day` instead. Note that a category folded
    this way used to get no section of its own; it now renders one, so give it an
    entry in `AreasSettings.icons`.
  - `AreasSettings.dayToDayLabel` and `icons` are unchanged.

  Consumers that relied on `universality:everyone` to fill the shelf must add
  `placement:day-to-day` to those resources, and should declare the new prefix in
  their own tag definitions so it stays a known vocabulary rather than a
  free-form keyword.

  `DAY_TO_DAY_TAG` is exported alongside `DAY_TO_DAY_AREA_KEY` so a consumer can
  reference the tag without retyping the literal.

### Minor Changes

- [#222](https://github.com/lislon/app-catalog/pull/222) [`2e00035`](https://github.com/lislon/app-catalog/commit/2e00035a66ffa54d07eecbaeb7d75feafa564582) Thanks [@lislon](https://github.com/lislon)! - A measured pass over the Quick Jump row: one inset, one type size, one fill.

  **It stays inside the panel.** Between 640 and 792px the row used to stop
  wrapping while the panel it sits in was still narrower than the control, so the
  group overflowed by ~100px, the panel grew a horizontal scrollbar and Jump — the
  primary action — sat off-screen. The row now wraps at every width, the group
  cannot exceed its container, and the identifier field can shrink.

  **The row holds exactly one brand fill, and it is on Jump.** The app's own open
  button and Jump had byte-identical backgrounds, so four elements read as one
  blob. The open button steps down to `secondary` with a border (without the
  border it merges into the destination picker instead — the two greys are 0.015
  apart in lightness) whenever the app also offers a Quick Jump, and keeps its
  primacy through position and its self-describing label. Both fills darken to
  5.19:1, up from 4.56:1 — `14px/700` is not large text.

  **Jump presses in rather than hopping.** The lift-and-crouch belongs to a
  free-standing button; on a segment welded into a bordered frame it covered the
  frame's top border on hover and opened 3.5px of card above itself on press. It
  now takes an inset shadow and a darker fill, and the arrival keyframe — caught
  mid-flight 2px outside the frame — is gone. The open button keeps the motion.

  **The width goes where the text is.** The picker was a fixed 11rem that
  truncated most destination titles while the field spent 249px on an 8-character
  id. The picker is now as wide as the app's widest destination (capped), sized
  from an invisible copy of that label so it cannot move when you switch
  destinations, and the field is 170px.

  **Everything lines up.** One 12px horizontal inset on the open button and all
  three segments, one 6px label-to-icon gap, one 14px/20px type scale, and a
  `min-height` on each segment rather than borrowed from a sibling — which is what
  left the picker a 20.5px tap target once it stacked (40px now), and made the row
  33.5px on an app with Quick Jumps but 32px on one without (34px on both now).
  Inner corners are concentric with the frame, and the dark theme's corner scale
  now matches the light one instead of quietly being half of it.

  **The dormant Jump describes itself once.** Its `title` said in different words
  what the hint bubble already says, and the bubble was `aria-hidden`, so a screen
  reader got neither; the bubble is now the button's `aria-describedby` and is
  anchored to the field it points at. Tabbing lights the frame on all three
  segments, not only the field, and the destination menu is never narrower than
  the picker that opened it.

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

- [#212](https://github.com/lislon/app-catalog/pull/212) [`eaa0d66`](https://github.com/lislon/app-catalog/commit/eaa0d66a3366ba3e35fcf841f82726154b943fce) Thanks [@lislon](https://github.com/lislon)! - Quick Jump: paste an id on a resource card and open the matching page

  A resource can now carry deep links that take an identifier. Each entry names
  the identifier in human words, the link title, and a url template with at most
  two placeholders — `{{baseHost}}` (the resource's own `appUrl`, trailing slash
  trimmed) and `{{value}}` (the typed id, url-encoded exactly once):

  ```ts
  quickJumps: [
    {
      identity: 'Case Id',
      title: 'View case',
      url: '{{baseHost}}/case/{{value}}',
    },
    {
      identity: 'Case Id',
      title: 'Audit log',
      url: '{{baseHost}}/audit?case={{value}}',
    },
  ]
  ```

  The detail panel groups them by `identity` — one column per identifier, in the
  order the data declares, with one input above its jumps. A jump is a dead,
  dashed placeholder until its input has a value, then becomes a real link that
  opens in a new tab; Enter in the input opens the column's first jump. A jump
  whose template needs a host on a resource that has no `appUrl` is dropped
  rather than rendered broken.

  Two per-user display choices live in `localStorage` (`ac:quickjump:<slug>`), so
  they cost no table and no authenticated route: which identifiers to show —
  picked in a **Configure (shown/total)** popover, defaulting to the first one —
  and whether to pin the section to the top of the card.

  `identity` is the label itself, so there is no dictionary to register: naming
  the same identifier on two resources is what links them, and the input's
  autofill key is derived from it, so the browser offers ids you typed elsewhere.

  Resources without `quickJumps` render exactly as before. `#143`

- [#219](https://github.com/lislon/app-catalog/pull/219) [`596b73a`](https://github.com/lislon/app-catalog/commit/596b73a7b9b4f71943ecf2431ac97e7092bb6f62) Thanks [@lislon](https://github.com/lislon)! - Source pulse: a per-source mark for how volatile a source is and whether its reading is current

  Each source in an entry's Sources list can now carry its own check schedule, and
  the detail panel draws it. `SourceReference` accepts a `schedule` on sync —
  `lastCheckedAt`, `nextCheckAfter`, `lastContentChangeAt`, `checkIntervalHours`
  and a newest-first `changeHistory` of `{ date, changed }` — persisted on five new
  nullable `SourceReference` columns (migration `20260919000000_add_source_schedule`).

  On read the serializer derives a display-ready `pulse` from it, the same way
  `freshness` is derived for the entry as a whole, so the UI stays a dumb renderer:

  ```ts
  { state: 'ok' | 'due' | 'stale' | 'never',
    intervalHours, cadence: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly',
    lastCheckedAt, dueAt, lastContentChangeAt, contentChangeIsLowerBound, checks }
  ```

  `state` shares its grace period with the entry-level `isStale`, so a source can
  never disagree with its own entry about being stale. `contentChangeIsLowerBound`
  is the honest case: `changeHistory` is capped, so once the last observed change
  ages out all we know is "older than this" — rendered as "over N ago", never as a
  date.

  The mark itself is one inline SVG, and it keeps its two channels separate:
  **shape carries volatility** (ticks on a real 90-day axis — tall for a check that
  found a change, short for one that did not, so a burst of churn looks like a
  burst) and **colour carries freshness**. Colour never carries it alone — the
  freshness circle also goes hollow → filled → filled-with-ring, and the tooltip
  prints the words. The four status hexes are deliberately not themed.

  At rest only the circle is drawn, inside a fixed-width slot, so a list of sources
  reads as a quiet column and hovering cannot reflow the row. Hover or keyboard
  focus fades the track in and opens a tooltip that doubles as the legend: every
  row is prefixed by the very glyph it explains (cadence, last change, last check,
  next check / was due). Sources the producer has never scheduled carry no
  `pulse` and simply get no mark, so entries sync'd from bare URLs look exactly as
  before. `#151`

### Patch Changes

- [#214](https://github.com/lislon/app-catalog/pull/214) [`12e2558`](https://github.com/lislon/app-catalog/commit/12e2558b8123d0ad9adcaccb86f4c9ab2571928b) Thanks [@lislon](https://github.com/lislon)! - Detail panel: description first, access instructions after it

  The prerequisite chain and "How to get access" used to render above the
  description, so opening a resource led with paperwork before saying what the
  thing is. They now sit directly below the description, ahead of screenshots.
  `#144`

- [#227](https://github.com/lislon/app-catalog/pull/227) [`566f4d8`](https://github.com/lislon/app-catalog/commit/566f4d88adfcd492e6ac4fe0ecccc88a94106f49) Thanks [@lislon](https://github.com/lislon)! - Switch on the animation utilities the overlays already ask for. `@import 'tw-animate-css'` had been commented out since the initial refactor, so the `animate-in` / `animate-out` / `fade-in-0` / `zoom-in-95` / `slide-in-from-top-2` classes on the dialog, alert dialog, popover, tooltip, select, dropdown and autocomplete primitives resolved to nothing and every overlay appeared and disappeared instantly. The stylesheet now also honours `prefers-reduced-motion: reduce`, which tw-animate-css does not do itself, and a test asserts the import stays live — a unit test on the class name passes either way, which is how this went unnoticed.

- [#224](https://github.com/lislon/app-catalog/pull/224) [`1e86c9e`](https://github.com/lislon/app-catalog/commit/1e86c9e0dbe819e81290d5b3c2f0ae7c576731e8) Thanks [@lislon](https://github.com/lislon)! - Opening an app's detail panel now puts the caret in the Quick Jump identifier
  field, so you can open an app and type an id without reaching for the mouse. It
  re-applies when you move to another app in the same panel, does not scroll the
  panel to itself, and stands down on coarse pointers, where focusing an input pops
  the virtual keyboard over half of what you just opened. Apps without a Quick Jump
  are unaffected — there is nothing to focus.

- [#228](https://github.com/lislon/app-catalog/pull/228) [`47e97c1`](https://github.com/lislon/app-catalog/commit/47e97c12338210221f4ff7dc88159336865f6c34) Thanks [@lislon](https://github.com/lislon)! - An app with no comments now invites you instead of showing an empty form: "Be the first." is a link that slides the composer open and puts the caret in it. When comments already exist the composer is there from the start and does not take focus.

- [#218](https://github.com/lislon/app-catalog/pull/218) [`36f4c36`](https://github.com/lislon/app-catalog/commit/36f4c36ce40122cc638c8db248b3a1add9a9cda0) Thanks [@lislon](https://github.com/lislon)! - Changing a url param no longer tears the page down and rebuilds it.

  Five routes awaited a loader that returned `{}`. Nothing ever read it — there is
  no `useLoaderData` call anywhere — but awaiting it made every navigation to those
  routes asynchronous, so a `?qj=`, `?sub=`, `?filterTag=` or `?deprecated=` change
  re-ran it, the route match went pending, and the subtree `_layout` renders was
  unmounted and rebuilt on the other side.

  Two things fell out of that. Component state inside the detail panel was
  destroyed on every param change. And the fresh mount re-ran the whole data layer:
  `/api/auth/session` twice, `auth.getProviders`, `comments.list` and
  `appCatalog.getData` on every param toggle.

  The loaders and the module they called are deleted. A test asserts the three
  render-nothing catalog routes declare none, because the integration test cannot:
  in jsdom the navigation resolves without the remount, so it passes either way.

- [#223](https://github.com/lislon/app-catalog/pull/223) [`cadc4f7`](https://github.com/lislon/app-catalog/commit/cadc4f70eab46c585644ca7b08b0f71d37669d6d) Thanks [@lislon](https://github.com/lislon)! - The detail panel's Tags list no longer shows `namespace:value` tags. Those drive
  grouping, faceting and placement — they are indexing machinery, roughly half of
  all tag references, and say nothing about what an app is for. The colon is the
  test. Search and filtering still match them, and the section is dropped entirely
  when an app has nothing else to show, rather than rendering an empty heading.

- [#226](https://github.com/lislon/app-catalog/pull/226) [`a297e00`](https://github.com/lislon/app-catalog/commit/a297e008f756aa8b200884a84bcb43d999519546) Thanks [@lislon](https://github.com/lislon)! - Load the body webfont again. The Google Fonts `@import` in `index.css` sat after `@import 'tailwindcss'`, where a remote import is invalid — so the minifier dropped it and body text silently fell back to a system face on any machine that did not happen to have the family installed locally. The import now comes first, and a test keeps every family named in `--font-sans` / `--font-serif` tied to an actual request.

- [#225](https://github.com/lislon/app-catalog/pull/225) [`ee3510f`](https://github.com/lislon/app-catalog/commit/ee3510f9a5aeb22245797ffa2650dc8b31d8e44d) Thanks [@lislon](https://github.com/lislon)! - Let the quick jump field keep the caret when a detail card opens. The card focuses itself so Esc closes it, and that was taking focus straight back off the field. Esc now also works from inside the field, and cancelling an inline edit with Esc no longer closes the card behind it.

- [#213](https://github.com/lislon/app-catalog/pull/213) [`83bdeed`](https://github.com/lislon/app-catalog/commit/83bdeed12d87e313a94879a153441944886d68c0) Thanks [@lislon](https://github.com/lislon)! - Quick Jump's hover tell now uses the grasshopper mark next to the green `JUMP`
  word, matching the mockup the section was designed against. It stood in as a
  lucide glyph, which read as a generic icon rather than as the one recognisable
  bit of the interaction.

  The test kit registers `vite-plugin-svgr` instead of mocking svg imports one at a
  time. The old setup only knew about a single file, so any component importing a
  new `?react` svg threw while rendering — which surfaced as the whole app panel
  failing to appear, several test files away from the actual cause.

- [#220](https://github.com/lislon/app-catalog/pull/220) [`182f048`](https://github.com/lislon/app-catalog/commit/182f0480f7fa08cc665500bf036ce1465c2cfaeb) Thanks [@lislon](https://github.com/lislon)! - Source pulse: expand a source's track when the whole row is hovered

  The mark sits in a right-hand column, so on a wide detail panel it can end up a
  few hundred pixels from the URL it describes. Hovering the row — not just the
  8px circle — now fades that source's track in, which is what ties the two ends
  of the row together. The tooltip still needs the mark itself. `#151`

- [#221](https://github.com/lislon/app-catalog/pull/221) [`19b6a33`](https://github.com/lislon/app-catalog/commit/19b6a337dcda5176416be6325c06dfb4d60031d4) Thanks [@lislon](https://github.com/lislon)! - Fix the url-synced state hook queueing a navigation on every render.

  `useUrlSyncedState` compared its encoded state against the `useSearch()`
  snapshot. That snapshot comes from the resolved route match, so while a
  navigation the hook itself issued is still settling it still reads the
  pre-navigation params — and since `encode` is an inline arrow at both call
  sites, the sync effect re-runs on every render. The "already in sync" check
  therefore never matched: each render queued another `navigate()`, each
  `navigate()` caused another render. Measured on a production build, one Quick
  Jump destination change produced 52 navigations in a single burst and ended in
  React's "Maximum update depth exceeded", which tore the panel down and took the
  id the user had typed with it (#152).

  The effect now reads the live router location instead. Spreading the live params
  also fixes a latent clobber: two instances of this hook writing different keys in
  one tick each spread their own stale snapshot and dropped the other's param.

- Updated dependencies [[`cbec2c5`](https://github.com/lislon/app-catalog/commit/cbec2c5b04ffddbcad3a0e50eef7161044313405)]:
  - @igstack/app-catalog-shared-core@4.0.0

## 3.0.0

### Minor Changes

- [#205](https://github.com/lislon/app-catalog/pull/205) [`3708635`](https://github.com/lislon/app-catalog/commit/370863596a11304147d0b1aef51ef1010aa19399) Thanks [@lislon](https://github.com/lislon)! - The full resource list is grouped into areas of wide cards instead of one flat A-Z list

  The catalog already carries a `category:<value>` tag on every resource and a
  `universality:everyone` tag on the day-one tools, but the list surfaced neither:
  ~190 alphabetically sorted, identical rows, each as prominent as the next. It
  now opens with a "Day-to-day tools" group and then one section per category,
  biggest section first, each with a large title, a tool count and a two- to
  three-column grid of cards. The area titles carry the section, so the old
  "Browse all" header above them is gone.

  No taxonomy is hardcoded: section titles come from the catalog's own `category`
  tag definition (`tagsDefinitions`, already served with the catalog data), and a
  value the definition does not know still gets a readable humanized title.

  New optional `UiSettings.areas` lets the consuming app decorate the sections:
  - `icons` — an icon component per category value, rendered in the section
    header in place of the accent bar (any `lucide-react` icon fits `AreaIcon`)
  - `dayToDayCategories` — category values that belong on the "anyone here may
    want this" shelf instead of an area of their own, folded into the first group
  - `dayToDayLabel` — the first group's title, default "Day-to-day tools"

  A card puts the icon on the left and the name plus a two-line description beside
  it, at a fixed height that leaves no dead space under the text. Hovering it
  expands the card downward to show the rest of the description; the expanded panel
  overlays the row below rather than reflowing the grid. Keyboard focus expands it
  the same way, and `prefers-reduced-motion` drops the animation.

  `AppCatalogGrid`'s `totalCount` prop is now optional and unused -- it only fed
  the count in the removed header. It stays accepted so existing callers compile.

### Patch Changes

- [#205](https://github.com/lislon/app-catalog/pull/205) [`c48994b`](https://github.com/lislon/app-catalog/commit/c48994bbc3bab81b94c07e564015bdc12b720a86) Thanks [@lislon](https://github.com/lislon)! - Make the PWA auto-update actually apply the update it downloads.

  `PwaAutoUpdateController` already checks for a new build when the user goes
  idle, when the tab becomes visible again, and when the error boundary catches a
  crash — but each of those ended at `registration.update()`. That only installs
  the new worker, which then sits in `waiting` for as long as any tab is still
  controlled by the old one. Reloading does not release it, so the browser kept
  serving the previously precached bundle indefinitely.

  Each trigger now posts `SKIP_WAITING` to the waiting worker, which is the
  message the generated service worker answers with `skipWaiting()`; the
  registration's `activated` listener then reloads the page onto the new build.
  The idle threshold drops from 5 minutes to 1 minute.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@3.0.0

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

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.4

## 2.0.3

### Patch Changes

- [#202](https://github.com/lislon/app-catalog/pull/202) [`f62753c`](https://github.com/lislon/app-catalog/commit/f62753c80043c327eb01c3c2f23a8b64456ea90f) Thanks [@lislon](https://github.com/lislon)! - Roles table no longer prints a role's internal admin notes

  `Role.adminNotes` holds provisioning detail -- directory group names, the SSO app,
  grant type, manual steps -- and is documented as never shown to the requester. The
  "Available Roles" table rendered it inline under each role's description, with no
  auth check or admin flag, so it reached everyone who could open the page. The cell
  now shows `description` alone (falling back to an em-dash when a role has no
  description).

  Where the capability list currently lives in `adminNotes` rather than
  `description`, that content is not displayed until it moves to `description` --
  tracked separately, since it is a data change rather than a rendering one.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.3

## 2.0.2

### Patch Changes

- [#199](https://github.com/lislon/app-catalog/pull/199) [`8bc5583`](https://github.com/lislon/app-catalog/commit/8bc5583af9939dc112b9c4cc1cc4dc90e0d9f3db) Thanks [@lislon](https://github.com/lislon)! - Launch buttons: accessible name now contains the visible text, plus the full URL on hover

  The `Open <host>` buttons on an app's detail page and on a sub-resource's detail
  page set `aria-label="Open <name>"`, which replaced the visible label rather than
  containing it. That fails WCAG 2.5.3 (Label in Name): someone driving the UI by
  voice says the words they can see, and those words were absent from the
  accessible name. Both buttons now use the wording the catalog grid already used
  -- `Open <name> in a new tab (<host>)` -- and carry a `title`, so the
  destination is still discoverable once CSS truncates it.

  The scheme-stripping used for display moved into one `displayUrl` helper. Five of
  its nine copies were unanchored (`/https?:\/\//g`), which mangled URLs that embed
  another URL in a query parameter -- an IAM Identity Center deep link ending in
  `&destination=https://console.aws.amazon.com/...` displayed a destination that
  does not exist.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.2

## 2.0.1

### Patch Changes

- [#196](https://github.com/lislon/app-catalog/pull/196) [`fcf46e8`](https://github.com/lislon/app-catalog/commit/fcf46e80cbb5803de1485d14fb0241bba9e041fd) Thanks [@lislon](https://github.com/lislon)! - Launch a sub-resource from its own detail page

  Clicking a sub-resource's name opens its detail panel, which showed the access
  chain but no way to open the thing — the only launch affordance lived in the
  parent table's cloud-account cell, so the most obvious path through the UI was a
  dead end. The panel now renders an `Open` button whenever the sub-resource has
  its own `appUrl`, keyed on that URL rather than on a cloud account id, so any
  sub-resource carrying one is launchable. It never falls back to the parent's
  URL — that fallback is what dropped people into the wrong AWS account.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.1

## 2.0.0

### Minor Changes

- [#191](https://github.com/lislon/app-catalog/pull/191) [`98e6cc7`](https://github.com/lislon/app-catalog/commit/98e6cc77ef262847891982b4afbd74e23f4ef038) Thanks [@lislon](https://github.com/lislon)! - Add comments to the app detail view, so users can leave feedback on an app without leaving the catalog.

  The catalog is browsable without logging in, so a comment is not tied to an account. The server issues an opaque token in an httpOnly cookie and stores its hash, which gives each browser a stable pseudonym ("Curious Ferret") and lets an author edit or delete their own comment for the first hour. The window is enforced on the server; the client only hides the controls.

  Adds one table, `DbComment`. The alias is stored on the row rather than derived at render time, so widening the wordlist later cannot rename everybody's history.

### Patch Changes

- [#192](https://github.com/lislon/app-catalog/pull/192) [`ce99b1b`](https://github.com/lislon/app-catalog/commit/ce99b1bc970f7d70497ce0eda46dbd41f5a9c248) Thanks [@lislon](https://github.com/lislon)! - Render a timestamp from a slightly-ahead server clock as "now" instead of "in 4 seconds"

- [#193](https://github.com/lislon/app-catalog/pull/193) [`47f5a9a`](https://github.com/lislon/app-catalog/commit/47f5a9aecd20722cb48d199a44413d048b3de431) Thanks [@lislon](https://github.com/lislon)! - Link a sub-resource's account id to its own launch URL

  The cloud-account column rendered the account id as plain text, so an entry
  carrying its own per-account console URL had no way to be opened — the only
  launch affordance was the parent's account-agnostic URL, which drops you into
  whichever account you last used. When a sub-resource has an `appUrl`, its id is
  now the link to it; ids without one stay plain text.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@2.0.0

## 1.0.1

### Patch Changes

- [#188](https://github.com/lislon/app-catalog/pull/188) [`2223ce0`](https://github.com/lislon/app-catalog/commit/2223ce0dbeed8d5b0fa642275975c9ccdf975b4b) Thanks [@lislon](https://github.com/lislon)! - Center the MCP docs page content. The column was capped at `max-w-3xl` but never centered, so on a wide screen the whole page sat against the left edge with a large empty gutter on the right.

- Updated dependencies []:
  - @igstack/app-catalog-shared-core@1.0.1

## 1.0.0

### Minor Changes

- [#185](https://github.com/lislon/app-catalog/pull/185) [`a7b251e`](https://github.com/lislon/app-catalog/commit/a7b251e83d8f297f1a3746ae69d5170720d00a83) Thanks [@lislon](https://github.com/lislon)! - Move the catalog ranking engine into shared-core and add an MCP docs page.

  `shared-core` now owns the search engine so both the UI and server-side callers
  rank resources identically. It exports `searchResources` (roots-only roll-up,
  behaviour unchanged from the previous frontend-only helper),
  `searchResourcesRanked` (same pass, but returns which field matched and how) and
  `searchWithinApp` (ranked search over one app's sub-resources, matching
  displayName, slug, aliases and description). The functions are generic over a
  structural `SearchableResource`, so no dependency on any persistence type.
  `highlightText` stays in `frontend-core`.

  `frontend-core` gains a `/mcp` route, reachable from the header view toggle,
  documenting the catalog's MCP server: endpoint, CLI one-liner and `.mcp.json`
  snippet — all built from the current origin — plus a tool reference read live
  from the server's own registry, so it cannot go stale.

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

- [#178](https://github.com/lislon/app-catalog/pull/178) [`3e0681b`](https://github.com/lislon/app-catalog/commit/3e0681be536d3dd19c6e1476ae727bdb77398014) Thanks [@lislon](https://github.com/lislon)! - Fix the fullscreen screenshot viewer (Gallery) pinning the enlarged image to the top-left corner instead of centering it. The fullscreen wrapper was missing flex centering entirely.

- [#176](https://github.com/lislon/app-catalog/pull/176) [`16ed741`](https://github.com/lislon/app-catalog/commit/16ed741d722d05e150d1a6fb8d468fbaf702e3a4) Thanks [@lislon](https://github.com/lislon)! - Header version footer (Pipeline #, SHA, Core version, FE build) now shows behind a small info icon popover instead of always-visible text, keeping the header compact. Content and links are unchanged, just revealed on click. Also added a small "by Igor Golovin" attribution line.

- Updated dependencies [[`a7b251e`](https://github.com/lislon/app-catalog/commit/a7b251e83d8f297f1a3746ae69d5170720d00a83)]:
  - @igstack/app-catalog-shared-core@1.0.0

## 0.18.6

### Patch Changes

- [#170](https://github.com/lislon/app-catalog/pull/170) [`ce742c7`](https://github.com/lislon/app-catalog/commit/ce742c718238639b3048955fe4b73532c9b3f1a2) Thanks [@lislon](https://github.com/lislon)! - Approver groups with no email now show each member as its own clickable, copyable chip instead of one opaque group chip with a plain-text member list.

- [#171](https://github.com/lislon/app-catalog/pull/171) [`173a00a`](https://github.com/lislon/app-catalog/commit/173a00a11aa0e36798af72ad482a62c695fadd92) Thanks [@lislon](https://github.com/lislon)! - Fix "New this week" so it reflects what was actually ADDED to the catalog. It previously keyed off the freshness job's re-check timestamps (`freshness.lastContentChangeAt` / `lastCheckedAt`), which meant a months-old app that had merely been re-verified showed up as new, while a genuinely new entry — which has no freshness data yet — could be missing. The section now filters and sorts on the catalog add date (`createdAt`) alone, so it agrees with the card's own "Added …" label.

- [#174](https://github.com/lislon/app-catalog/pull/174) [`003b19c`](https://github.com/lislon/app-catalog/commit/003b19ca966c20e1af3fda74bbbe077a0339b544) Thanks [@lislon](https://github.com/lislon)! - App detail card now shows a collapsed-by-default "Technical information" section, right after Teams, when the entry has an `aiPrompt` and/or `aiMemory` value set. These AI-facing fields were previously not surfaced in the UI at all.

## 0.18.5

### Patch Changes

- [#167](https://github.com/lislon/app-catalog/pull/167) [`da25c2a`](https://github.com/lislon/app-catalog/commit/da25c2a48fdd4fa191058e4351acc0d70f135b9d) Thanks [@lislon](https://github.com/lislon)! - Fix "New this week": a newly-added catalog entry never appeared there, no matter how recent, because the section only checked freshness-tracking timestamps (content-change/last-checked), which a brand-new entry never has. It now also falls back to `createdAt`.

## 0.18.4

### Patch Changes

- [#162](https://github.com/lislon/app-catalog/pull/162) [`35306ba`](https://github.com/lislon/app-catalog/commit/35306ba5dcada115b01fde52a18282bd2e1eb08d) Thanks [@lislon](https://github.com/lislon)! - Fix sub-resource table: AWS account ID is now plain selectable text instead of a copy-button (couldn't be selected by mouse). Approver groups with no real display name now show member names instead of the opaque group slug.

## 0.18.3

## 0.18.2

## 0.18.1

## 0.18.0

### Minor Changes

- [`edf38ec`](https://github.com/lislon/app-catalog/commit/edf38ec6ec9dbe1bdc709556f21896c0f13a0ff7) Thanks [@lislon](https://github.com/lislon)! - Search and navigation improvements: stable launcher shell with no layout shift when typing, sub-resource rows in search open parent app with pre-filtered sub-resources table, scroll position preserved when opening/closing the app detail overlay.

## 0.4.0-alpha-20260819143830

## 0.4.0-alpha-20260818210825

## 0.4.0-alpha-20260818041444

### Patch Changes

- [#136](https://github.com/lislon/app-catalog/pull/136) [`554e85b`](https://github.com/lislon/app-catalog/commit/554e85bc298b74a4c2cfee70bde7ec5142c94c9b) Thanks [@lislon](https://github.com/lislon)! - Cap the `better-auth` dependency below 1.7.0

  1.7.0 dropped the `genericOAuthClient` export from `better-auth/client/plugins`, which
  `modules/auth/authClient.ts` imports. The dependency was declared as `^1.4.18`, and that
  caret range ships in the published packages — so any consumer that installs without a
  lockfile resolves 1.7.0 and its bundler fails the build on the missing export
  (`"genericOAuthClient" is not exported by better-auth/dist/client/plugins/index.mjs`).

  The range is now `>=1.4.18 <1.7.0`, which keeps patch and minor updates flowing while
  excluding the breaking release. Raise the cap when `authClient` migrates to the 1.7
  entry point.

## 0.4.0-alpha-20260817192135

## 0.4.0-alpha-20260817183828

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

## 0.4.0-alpha-20260814035133

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260813154215

## 0.4.0-alpha-20260813153122

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

## 0.4.0-alpha-20260813024744

## 0.4.0-alpha-20260812171537

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260812005550

### Patch Changes

- Snapshot release from alpha branch

## 0.4.0-alpha-20260812004355

### Patch Changes

- Snapshot release from alpha branch

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
