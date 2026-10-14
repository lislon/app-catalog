---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-test-kit': patch
---

Header shows the Login button to anonymous visitors again

Signing in is now useful for more than an admin, so the header offers it again. The button
opens the sign-in modal and returns the visitor to the page they were on. The `/login` route
fix from the earlier change stays. DEV Login still appears only when the backend enables it.
