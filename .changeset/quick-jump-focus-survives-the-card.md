---
'@igstack/app-catalog-frontend-core': patch
---

Let the quick jump field keep the caret when a detail card opens. The card focuses itself so Esc closes it, and that was taking focus straight back off the field. Esc now also works from inside the field, and cancelling an inline edit with Esc no longer closes the card behind it.
