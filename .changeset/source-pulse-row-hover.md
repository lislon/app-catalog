---
'@igstack/app-catalog-frontend-core': patch
---

Source pulse: expand a source's track when the whole row is hovered

The mark sits in a right-hand column, so on a wide detail panel it can end up a
few hundred pixels from the URL it describes. Hovering the row — not just the
8px circle — now fades that source's track in, which is what ties the two ends
of the row together. The tooltip still needs the mark itself. `#151`
