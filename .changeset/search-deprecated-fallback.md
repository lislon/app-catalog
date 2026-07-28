---
'@igstack/app-catalog-frontend-core': patch
---

Search now falls back to deprecated apps when there are no active matches. If a
search query returns zero non-deprecated results but deprecated apps match, the
catalog shows those deprecated matches, displays a "showing deprecated matches"
notice, and auto-enables the "Show Deprecated Apps" toggle so the state is
visible and consistent. When the query has active matches, deprecated apps stay
hidden as before; when nothing matches at all, the normal empty state shows.
