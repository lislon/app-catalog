---
'@igstack/app-catalog-frontend-core': patch
---

Fix the catalog page's bottom spacing. The bottom clearance now sits on the scroll container, so it applies to whatever ends the page — the attribution footer or the last card row — instead of leaving a ~160px band above the footer's rule and no padding at all below its text.
