---
'@igstack/app-catalog-frontend-core': patch
---

Dev-only warning when the catalog loads resources but none are top-level (fingerprints a frontend/backend-core version skew or a stale service worker), so an empty catalog is diagnosable at a glance instead of looking like a data outage.
