---
'@igstack/app-catalog-frontend-core': patch
---

Memoize the sub-resources table row, which makes filtering a large table
roughly 12x cheaper.

Measured on a catalog entry with 667 sub-resources: a filter keystroke that
left every row on screen cost **~400 ms** and wrote **9 attributes to the DOM**.
The browser can build all 33,861 of that table's nodes from scratch in ~195 ms,
so React was spending twice the cost of a full rebuild to change almost
nothing. The work was render and reconciliation — every row's element tree
rebuilt and diffed — not the DOM, and not the number of rows as such.

The row is now its own memoized component, and the same keystroke costs
**~33 ms**. Two details carry that:

- Props must stay referentially stable. The resource objects already come from
  a `useMemo` filter, so their identities survive a keystroke.
- The highlight arrives as a **boolean**, not as the highlighted slug. Passing
  the slug and comparing inside the row would change one prop on every row
  whenever the highlight moved, re-rendering the whole table to restyle two
  rows.

Rendering is unchanged, and the Admin column still derives from one flag shared
by the header, the cells and the empty row's `colSpan` — now carried as a single
`adminParent` prop, so cells cannot disagree with their header.

The filter box additionally renders through `useDeferredValue`, which fixes the
cost `memo` cannot: rows that come BACK as a filter is widened have to mount,
and that mount was blocking the caret. Measured on the same 667-row table,
worst-case input latency across a five-keystroke sequence, three runs each:

|                                  | without            | with               |
| -------------------------------- | ------------------ | ------------------ |
| worst keystroke                  | 870 / 871 / 893 ms | 30 / 29 / 20 ms    |
| average keystroke                | 196 / 199 / 208 ms | 30 / 32 / 37 ms    |
| five-character burst, to settled | 183 / 183 / 166 ms | 116 / 114 / 114 ms |

React now commits the typed character immediately and re-renders the table at
low priority, abandoning a superseded pass instead of finishing one per
character. Deliberately not a debounce: no delay to tune, nothing discarded for
a fast typist, and the final result is never late. While the rows are a render
behind, the table carries `aria-busy` and dims, so stale rows read as stale.

The two changes are complementary rather than alternatives — `memo` removes the
re-render cost, deferral removes the mount cost from the input's critical path —
and deferral only helps because the row is memoized, since skipping work is what
React is being given permission to do.

Investigated and rejected along the way, recorded so the time is not re-spent:
the linear `getPersonBySlug` / `getGroupBySlug` scans run 782,082 comparisons
per render of that table and cost 5.2 ms, which is 0.14% of the budget; and the
Radix popover on each person chip costs only 1.6x a plain chip. Neither is worth
changing for performance. Virtualization would also solve this, but it is not
needed at this size once the row is memoized.
