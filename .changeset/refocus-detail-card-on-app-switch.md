---
'@igstack/app-catalog-frontend-core': patch
---

Take the caret back into the detail card when it navigates from one app to
another. The card body now remounts on that navigation, which destroys
whatever was focused (the "View replacement" button, an access
prerequisite's parent), while the card's focus effect only ran on mount --
so focus landed on `<body>` and the next Tab walked the catalog grid behind
the scrim, the card having no focus trap. The effect now runs per resource
shown, and still yields to a child that has already taken the caret.
