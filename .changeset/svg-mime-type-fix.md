---
'@igstack/app-catalog-backend-core': patch
---

Serve SVG assets as `image/svg+xml`. `sharp` reports `format === 'svg'`, but
`formatToMime` had no `svg` key, so `parseAssetMeta()` fell through to the
`image/${format}` fallback and produced the invalid `image/svg`. Behind a
`X-Content-Type-Options: nosniff` proxy, browsers refuse to render such a
response in an `<img>`, so SVG icons silently fell back to placeholder UI.

`upsertAsset()` now also rewrites the stored `mimeType` when it no longer matches
the freshly-derived one. It reuses an existing row by name to avoid duplicating
the binary, and previously returned early without touching the metadata — so rows
written by the old derivation could never be corrected, not even by a re-sync.
The rewrite is idempotent and repairs stale rows on the next sync.
