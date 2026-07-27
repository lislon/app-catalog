---
'@igstack/app-catalog-frontend-core': patch
---

Fix the app detail route (`/app/$slug`) stripping the `q` search param. The
route had no `validateSearch` schema, so TanStack Router dropped unknown params
on navigation — including the URL-synced search query. That defeated the #10
fix in the real router: `q` never survived the auto-navigation, so the search
input still cleared. Added a `validateSearch` schema declaring `q` and the other
URL-synced filter params (`filterTag`, `recent`, `filters`, `deprecated`).
