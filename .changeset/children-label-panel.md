---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Use `childrenLabel` for the sub-resources panel, not only for the tab.

A parent resource can already name its children with `childrenLabel`, and the
detail tab has always honoured it. The panel the tab opens did not: its heading
and its filter placeholder were hard-coded, so naming the children renamed the
tab and left the heading underneath contradicting the tab the user had just
clicked. Both now follow the same field.

A catalog that sets no `childrenLabel` renders exactly as before. The two
fallbacks stay as they were and are deliberately different — the heading reads
"Sub-Resources" and the placeholder "resources" — because making them agree
would change wording in every existing deployment. The label is also used
verbatim rather than lower-cased, so an acronym survives.

The heading now carries `data-testid="sub-resources-heading"`, and the test
kit's `getSubResources()` locates it by that instead of by matching the literal
text "Sub-Resources (n of m)". The old selector returned `null` for any catalog
that named its children, which read as "this resource has no children" rather
than as a broken selector.
