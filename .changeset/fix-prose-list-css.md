---
'@igstack/app-catalog-frontend-core': patch
---

Fix markdown prose list rendering — add .prose ol/ul rules to index.css so list markers compile into the published dist bundle (Tailwind v4 JIT doesn't compile utility classes from published npm dist TSX).
