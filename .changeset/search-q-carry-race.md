---
'@igstack/app-catalog-frontend-core': patch
---

Fix the search input still resetting when typing into an empty search and the
query narrows to a single app. The auto-navigate effect runs before the filters
provider's async state→URL sync, so at navigation time the URL did not yet hold
the `q` param and it was carried through as empty. The current search value is
now injected directly into the auto-navigation's search params, so the typed
query lands in the URL and the input stays populated across the route change.
