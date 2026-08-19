---
'@igstack/app-catalog-backend-core': patch
---

Revalidate icon, asset and screenshot binaries instead of caching them for a day

These URLs are keyed by row id or by name, and `upsertAsset` replaces content in
place rather than inserting a new row — so the bytes behind a given URL can
change. With `Cache-Control: public, max-age=86400` a browser that had already
loaded an icon kept serving the old artwork from its disk cache for up to 24
hours after the replacement shipped, which reads as "the deploy did not work".

The three binary routes now send an `ETag` derived from the stored checksum (plus
the resize parameter, where one applies) together with
`Cache-Control: public, max-age=0, must-revalidate`, and answer a matching
`If-None-Match` with `304` before doing any image work. Unchanged content still
costs a single conditional request with no body, and a replacement is visible on
the next request.
