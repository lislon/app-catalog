---
'@igstack/app-catalog-frontend-core': patch
---

Virtualize large sub-resource tables, and keep the sub-resource tab when a
singled-out sub-resource is cleared.

**Opening the sub-resources tab of a large entry took about a second.** Tab
panels mount only while active, so every switch to the tab built the whole table
from scratch — measured at ~950 ms for 667 rows and 33,861 DOM nodes, every time.
Memoizing the rows cannot help: that saves re-rendering, and this is mounting.
Past 60 rows the body is now virtualized, so only the rows on screen plus a
margin are mounted. The same switch measures 69–156 ms, with 13 rows and 531
nodes mounted. Tables at or under 60 rows render exactly as before.

It stays a real `<table>`: rows outside the window are stood in for by spacer
rows rather than absolutely positioned, so the sticky header still resolves
against the container that scrolls. A table big enough to be windowed uses fixed
table layout with explicit column widths; with auto layout a column is as wide
as its widest mounted cell, and the columns moved by up to 264 px while
scrolling. The choice is made on the table's total size, so a large table keeps
one layout while it is filtered below the threshold rather than jumping as the
user types. Measured after: 0 px column drift, 0 px header drift, CLS 0.

Without layout — jsdom, print — the scroll container measures 0 tall and a
virtualizer would mount nothing, leaving every row unreachable, so the table
renders all rows instead. `Table` gains a `containerRef` prop, since the scroll
container is the element it creates, not the `<table>`.

**Clearing a singled-out sub-resource dropped the reader on Overview.** Arriving
with `?sub=` forces the sub-resource tab without selecting it; clearing the
selection released the force, and the strip fell back to its default. Now a
released force becomes the actual selection when the user has not picked a tab
themselves, so the view does not move and `?tab=` records it for a reload.
