---
'@igstack/app-catalog-frontend-core': patch
---

Move a truncated roles table's expander into the table: the last body row now
carries an ellipsis plus "Show all (N) roles", so the table visibly continues
past its last data row. The old standalone link under the closed table border
read as "list complete" and went unnoticed.
