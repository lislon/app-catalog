---
'@igstack/app-catalog-frontend-core': patch
---

Opening an app's detail panel now puts the caret in the Quick Jump identifier
field, so you can open an app and type an id without reaching for the mouse. It
re-applies when you move to another app in the same panel, does not scroll the
panel to itself, and stands down on coarse pointers, where focusing an input pops
the virtual keyboard over half of what you just opened. Apps without a Quick Jump
are unaffected — there is nothing to focus.
