---
'@igstack/app-catalog-frontend-core': patch
---

Make the PWA auto-update actually apply the update it downloads.

`PwaAutoUpdateController` already checks for a new build when the user goes
idle, when the tab becomes visible again, and when the error boundary catches a
crash — but each of those ended at `registration.update()`. That only installs
the new worker, which then sits in `waiting` for as long as any tab is still
controlled by the old one. Reloading does not release it, so the browser kept
serving the previously precached bundle indefinitely.

Each trigger now posts `SKIP_WAITING` to the waiting worker, which is the
message the generated service worker answers with `skipWaiting()`; the
registration's `activated` listener then reloads the page onto the new build.
The idle threshold drops from 5 minutes to 1 minute.
