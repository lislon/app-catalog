---
'@igstack/app-catalog-frontend-core': patch
---

Gallery: clicking the fullscreen image now exits fullscreen, making zoom a
reversible click toggle. Previously the only way out of the zoomed view was the
✕ button or Escape. The fullscreen image gets a `cursor-zoom-out` affordance and
`role="button"` / `aria-label="Zoom out"`; the ✕ button and Escape handler are
unchanged.
