---
'@igstack/app-catalog-frontend-core': major
---

The day-to-day shelf is now an explicit, additive `placement:day-to-day` tag

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
