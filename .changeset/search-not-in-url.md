---
'@igstack/app-catalog-frontend-core': patch
---

Keep the catalog search text out of the URL. The search box previously synced
its value to a `?q=` query param, so opening or sharing an app link carried the
search term along (`/app/<slug>?q=<search>`), cluttering the deep link. The
search value now persists in `sessionStorage` instead, so it still survives the
per-route remount of the filters provider — including the auto-navigation to a
single match, where the input text must not be lost — while shared and
bookmarked links stay clean `/app/<slug>` (or `/`). Incoming legacy `?q=` links
are stripped from the URL on load via a `stripSearchParams` search middleware.
