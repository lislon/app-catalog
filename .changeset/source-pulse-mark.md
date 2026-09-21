---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Source pulse: a per-source mark for how volatile a source is and whether its reading is current

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
