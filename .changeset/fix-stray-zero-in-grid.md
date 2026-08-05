---
'@igstack/app-catalog-frontend-core': patch
---

Fix stray `0` appearing in the catalog grid when a search matches no apps. The
numeric `&&`-gated "Clear filters" row now uses `(totalAppsCount ?? 0) > apps.length`
so it can never render a bare number as a React text node.
