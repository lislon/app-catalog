---
'@igstack/app-catalog-frontend-core': patch
---

Load the body webfont again. The Google Fonts `@import` in `index.css` sat after `@import 'tailwindcss'`, where a remote import is invalid — so the minifier dropped it and body text silently fell back to a system face on any machine that did not happen to have the family installed locally. The import now comes first, and a test keeps every family named in `--font-sans` / `--font-serif` tied to an actual request.
