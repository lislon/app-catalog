---
'@igstack/app-catalog-frontend-core': patch
---

Defer the catalog search results, so typing in the launcher stops waiting on
the result list.

Searching rebuilds the ranked result set from scratch on every keystroke —
`searchResources` rebuilds its parent index, scores every resource across 15
tiers and sorts — and the first keystroke additionally unmounts the entire
discovery spine while the last one remounts it. All of that sat between the
keypress and the caret moving. The results now render from a deferred copy of
the query while the input stays on the live value, so React commits the typed
character first and the list after, abandoning a superseded pass instead of
finishing one per character.

Measured in real Chromium on a 167-card catalog, three runs each:

|                                    | before             | after              |
| ---------------------------------- | ------------------ | ------------------ |
| average keystroke                  | 48 / 49 / 52 ms    | 36 / 32 / 35 ms    |
| first keystroke (spine to results) | 132 / 139 / 131 ms | 98 / 86 / 100 ms   |
| keystroke that widens the query    | 41 / 38 / 46 ms    | 19 / 13 / 14 ms    |
| five-character burst, to settled   | 231 / 231 / 237 ms | 234 / 234 / 201 ms |

Time-to-settled is unchanged by design: deferring moves work off the typing
path rather than removing it. The gain is in latency, and it is largest on the
keystroke that widens a query, which is the one that has to bring rows back.

Two details are load-bearing, and both were wrong in the obvious
implementation:

- **`isSearching` is derived from the deferred query**, so the results/spine
  swap happens in the same low-priority pass as the rows. Driving it from the
  live value tears the frame — the spine unmounts while the results are still a
  render behind, and the page blanks. Verified by sampling the DOM every frame
  across a keystroke: the content area never empties.
- **The results list receives the deferred query**, so the `Highlight` marks
  come off the same value as the rows. Feeding it the live query highlights
  substrings the rows do not contain.

Separately, the grid's app list is now memoized in `AppCatalogPage`. It was
filtered inline in JSX, producing a new array identity on every render, and the
grid keys four `useMemo`s off that prop — the slug index, "new this week", the
browse list and its area grouping. All four recomputed on every keystroke,
including while searching, when the spine they feed is not on screen.

Also adds the first test coverage for `?deprecated=1`, which had none: the
existing deprecated tests all go through search, which reads the full resource
set and never consults the flag.
