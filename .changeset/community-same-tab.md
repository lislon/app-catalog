---
'@igstack/app-catalog-shared-core': patch
'@igstack/app-catalog-backend-core': patch
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-test-kit': patch
---

Community tools open a tool's site in the same tab, and show when the site was last updated. Every card open and every click through to the site counts as a view. A health check that gets no answer from a site (a timeout or a refused connection) no longer marks it Not working; the card says the server can't reach it instead.
