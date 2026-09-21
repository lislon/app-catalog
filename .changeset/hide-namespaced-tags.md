---
'@igstack/app-catalog-frontend-core': patch
---

The detail panel's Tags list no longer shows `namespace:value` tags. Those drive
grouping, faceting and placement — they are indexing machinery, roughly half of
all tag references, and say nothing about what an app is for. The colon is the
test. Search and filtering still match them, and the section is dropped entirely
when an app has nothing else to show, rather than rendering an empty heading.
