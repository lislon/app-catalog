---
'@igstack/app-catalog-backend-core': patch
---

Fix `upsertAsset` silently discarding new binary content when an asset row with the same name already exists. Previously, only `mimeType` was ever patched on an existing row — replacing an icon or screenshot file on disk (same app slug, same derived asset name) had no effect on future syncs, no matter how many times the app redeployed. Now the stored `checksum` is compared against the freshly computed one; on a mismatch the whole row (`content`, `checksum`, `fileSize`, `width`, `height`, `mimeType`) is rewritten together.
