---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-test-kit': patch
---

The detail card's chunk now loads after the catalog's first paint, so the first click on a row opens the card without waiting for it. The test kit loads the same chunk before it mounts the app, and it exports its wait budgets from `@igstack/app-catalog-test-kit/timeouts`. Every wait inside a step is shorter than the step, so a failure shows the wait's own error.
