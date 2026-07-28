---
'@igstack/app-catalog-frontend-core': patch
---

Fix the deprecated-app "View replacement" link (and deep links) rendering a
blank panel. Navigating to /app/<slug> now resolves the open app from the full
resource set, and the catalog renders the detail panel even when the current
search/filters would otherwise show an empty state. Previously the panel
resolved the open app only from the filtered list, so a replacement (or any
deep-linked app) not matching the active search changed the URL but showed
nothing. "Hard navigation" now behaves like typing the URL in the browser.
