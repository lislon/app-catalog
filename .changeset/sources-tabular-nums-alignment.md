---
'@igstack/app-catalog-frontend-core': patch
---

Left-align the numbered "Sources" list in the app-detail panel. The list item
markers ("1.", "2.", …) are shrink-wrapped spans; in a proportional font the
glyph "2" is wider than "1", so the text on later rows started a few pixels to
the right of the first and the list stopped reading as left-aligned. The marker
spans now use `tabular-nums` so every digit is equal-width and all rows share
the same left edge (applied to both the read-only and admin-editable
renderings).
