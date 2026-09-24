---
'@igstack/app-catalog-frontend-core': patch
---

Remove the unused `slate` and `slate-react` dependencies. No editor uses them any more; they only pulled in a `slate-dom` whose peer range the declared `slate` did not satisfy.
