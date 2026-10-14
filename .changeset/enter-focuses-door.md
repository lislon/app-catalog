---
'@igstack/app-catalog-frontend-core': patch
---

Opening an app detail card now puts focus on the app's link, so a second
Enter after Enter on a search result opens the app the way any link does —
with its focus ring showing where Enter goes. The card's own Enter shortcut
no longer opens the app; it opens the screenshot gallery for apps with no
address, as before.
