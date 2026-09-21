---
'@igstack/app-catalog-frontend-core': patch
---

Switch on the animation utilities the overlays already ask for. `@import 'tw-animate-css'` had been commented out since the initial refactor, so the `animate-in` / `animate-out` / `fade-in-0` / `zoom-in-95` / `slide-in-from-top-2` classes on the dialog, alert dialog, popover, tooltip, select, dropdown and autocomplete primitives resolved to nothing and every overlay appeared and disappeared instantly. The stylesheet now also honours `prefers-reduced-motion: reduce`, which tw-animate-css does not do itself, and a test asserts the import stays live — a unit test on the class name passes either way, which is how this went unnoticed.
