---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-test-kit': patch
---

The Community tools tab no longer appears late for returning visitors. Its feature switch is stored in IndexedDB and, when present, loaded before the layout renders, so all section tabs show on the first paint and while offline. A first-ever visit does not wait for it.
