---
'@igstack/app-catalog-frontend-core': patch
---

Redirect `/app/<alias>` to the canonical `/app/<slug>`. When an app's slug
changes, its old slug can be listed in `aliases[]`; visiting the old URL now
redirects (client-side, replace) to the canonical app instead of showing a
blank catalog.
