---
'@igstack/app-catalog-frontend-core': patch
---

Fix the url-synced state hook queueing a navigation on every render.

`useUrlSyncedState` compared its encoded state against the `useSearch()`
snapshot. That snapshot comes from the resolved route match, so while a
navigation the hook itself issued is still settling it still reads the
pre-navigation params — and since `encode` is an inline arrow at both call
sites, the sync effect re-runs on every render. The "already in sync" check
therefore never matched: each render queued another `navigate()`, each
`navigate()` caused another render. Measured on a production build, one Quick
Jump destination change produced 52 navigations in a single burst and ended in
React's "Maximum update depth exceeded", which tore the panel down and took the
id the user had typed with it (#152).

The effect now reads the live router location instead. Spreading the live params
also fixes a latent clobber: two instances of this hook writing different keys in
one tick each spread their own stale snapshot and dropped the other's param.
