---
'@igstack/app-catalog-backend-core': minor
'@igstack/app-catalog-frontend-core': minor
---

Add comments to the app detail view, so users can leave feedback on an app without leaving the catalog.

The catalog is browsable without logging in, so a comment is not tied to an account. The server issues an opaque token in an httpOnly cookie and stores its hash, which gives each browser a stable pseudonym ("Curious Ferret") and lets an author edit or delete their own comment for the first hour. The window is enforced on the server; the client only hides the controls.

Adds one table, `DbComment`. The alias is stored on the row rather than derived at render time, so widening the wordlist later cannot rename everybody's history.
