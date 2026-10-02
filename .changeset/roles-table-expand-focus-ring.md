---
'@igstack/app-catalog-frontend-core': patch
---

Give the roles table's expand row a visible focus ring. It was a plain
button with no focus-visible styling, and the ring had to be drawn inside
the border box anyway: the table container is `overflow-x-auto`, which
clips an outline drawn outside it, and the control's edges sit flush with
that clip box.
