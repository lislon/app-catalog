---
'@igstack/app-catalog-frontend-core': minor
---

Add a widen button to the app detail card, directly left of the close button.
It drops the card's 1120px cap so long content (roles tables, access steps,
screenshots) can use the full width; clicking it again restores the normal
width. The state is not persisted: every card opens at the normal width.
