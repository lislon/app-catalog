---
'@igstack/app-catalog-frontend-core': patch
---

Keep the header "Apps" tab active while viewing an app-detail route
(`/app/<slug>`). Previously the toggle used an exact match on `/`, so on
`/app/<slug>` neither "Apps" nor "Service Desks" was highlighted (#23). The
active segment is now derived from the current pathname.
