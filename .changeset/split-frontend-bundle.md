---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-frontend-build-vite': patch
---

Split the frontend bundle: devtools are dev-only, the detail card loads on first open, and React/TanStack/tRPC get their own long-cached vendor chunks (#120).
