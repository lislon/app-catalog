---
'@igstack/app-catalog-frontend-core': patch
---

Render internal cross-reference links in catalog markdown as in-app router
navigation. A relative `[Name](/app/<slug>)` link in a description/comment now
navigates within the catalog via the TanStack router (same tab, no full
reload) instead of opening a new browser tab, so entries can cross-link each
other with plain markdown (#25). The slug is validated against the loaded
resources (canonical slug or a known alias) — an unknown slug renders as plain
text rather than a dead link, and the link gets `aria-current="page"` when it
points at the currently open app. External http/https links are unchanged
(still open in a new tab with `noopener noreferrer`).
