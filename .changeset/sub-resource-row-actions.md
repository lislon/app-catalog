---
'@igstack/app-catalog-frontend-core': minor
---

Add a per-row slot to the sub-resources table, and keep its header visible.

`resourceSubResourceRowActions` is called once per rendered row and handed that
row plus its parent — the opposite shape to the existing header slot, which is
called once with the whole list. It renders in a column of its own, which
appears only when a plugin fills it, so a build with no plugins renders the
table exactly as before: same five columns, same empty-state width.

Note that the table renders every row with no virtualisation, so a contribution
here is mounted once per child — keep the cell cheap and defer work until it is
interacted with.

`<Table stickyHeader className="max-h-[...]">` pins the header while the body
scrolls. The height limit has to go on the table's own container, not on an
ancestor: that container sets `overflow-x: auto`, which per spec makes
`overflow-y: visible` compute to `auto`, so it is already the scrollport a
sticky header resolves against. A height limit anywhere above leaves the header
pinned to an element that never scrolls vertically, and it scrolls away as if
nothing had been set.

Also fixes a crash in the sub-resource filter: `extra` is nullable on a served
resource, and the filter dereferenced it through a cast, so typing in the search
box threw a `TypeError` as soon as it met a child without it.
