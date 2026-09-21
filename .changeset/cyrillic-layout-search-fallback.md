---
'@igstack/app-catalog-shared-core': patch
---

Search: find English names typed on a Cyrillic keyboard layout

Typing an app name with the keyboard left on the Cyrillic layout produced a
query like `пфещк` and no results. When a search comes back empty and the query
contains Cyrillic, it is now re-read through the physical keys — `пфещк` becomes
`gator` — and searched again. Queries that already have results are untouched,
so no existing search changes its results or its ranking. Applies to the
`"<app>/<term>"` within-app search too.
`#149`
