---
'@igstack/app-catalog-frontend-core': patch
---

Fix search input losing text and focus when it auto-navigates to a single
match. Typing a query that narrows the catalog to one app auto-opens that app's
detail page, but the search value lived in component-local state (not the URL)
and the filters provider remounts per route — so the input and keyboard focus
were wiped on navigation. The search query is now URL-synced (`q` param) and
carried through the auto-navigation, so the input stays populated and focused.

Also fixes a latent bug in `useUrlSyncedState`: it only synced state→URL when
the param was already present at mount, so a value first set from its default
(e.g. the first keystroke in an empty search) never reached the URL. The
existing in-sync equality check already prevents default-value pollution, so
the redundant init gate was removed.
