---
'@igstack/app-catalog-frontend-core': patch
---

Fix `useAuth must be used within AuthProvider` on the root route's fallback
components. The `pendingComponent` (`LoadingScreen`) and `notFoundComponent`
(`NotFoundError`) render `MainLayout → Header → useAuth()` but the router
renders these fallbacks outside the app's provider tree. They are now wrapped
in `TopLevelProvidersForErrors`, so any unknown URL (deterministic) and slow
cold-load pending states (intermittent) no longer crash — they render the
clean 404 / loading UI instead.
