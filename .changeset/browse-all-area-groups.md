---
'@igstack/app-catalog-frontend-core': minor
---

The full resource list is grouped into areas of wide cards instead of one flat A-Z list

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
