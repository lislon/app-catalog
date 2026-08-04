---
'@igstack/app-catalog-frontend-core': patch
---

Stop raw markdown from leaking as literal text in compact/clamped catalog
surfaces (#25 follow-up). Descriptions can now contain markdown (notably
cross-reference links like `[Signatera Portal](/app/signatera-portal)`), which
the detail panel renders as real links. But the grid list preview, the
`AppCatalogTable` row, the sub-resources table, and the filter combobox render
`description` as plain text, so the raw link syntax was visible to users. Those
compact/`line-clamp` surfaces now render descriptions through a new
`markdownToPlainText` helper — showing just the visible text (e.g. "Signatera
Portal") with no bracket/paren syntax and no interactive link that could break
the clamp or layout. The full interactive cross-links remain in the detail
view.
