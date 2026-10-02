---
'@igstack/app-catalog-backend-core': patch
---

Decide an asset's content type from its filename extension rather than from the
`mimeType` column.

That column held whatever the image library detected at upload time, and a wrong
value was permanent: behind an `X-Content-Type-Options: nosniff` proxy a browser
refuses to render an unrecognised type in an `<img>`, so an icon silently
degraded to its placeholder with nothing in the logs. One such value (`image/svg`
for an SVG) was mapped away earlier; the open-ended `image/${format}` fallback
that produced it could still mint `image/<anything>` for the next unmapped
format, so it is gone — an unrecognised file is now `application/octet-stream`.

Also in this change:

- Icon and screenshot routes derive the served type the same way, so a row
  already stored with a bad type renders correctly without a re-sync.
- Asset and screenshot URLs may carry the file extension (`/<id>.png`), which
  gives a browser, a cache and "save image as" the real type; the extension-less
  form keeps working.
- Uploads record the type from the uploaded filename instead of a client-supplied
  header, and the asset upload route reads the filename from `originalname`
  (`filename` is unset under in-memory storage, so no extension reached the
  derivation at all).
