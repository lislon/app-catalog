---
'@igstack/app-catalog-test-kit': patch
---

The harness stubs `window.scrollTo`, so the router's scroll restoration no longer prints `Error: Not implemented` on every navigation under jsdom, and the mock network answers `comments.list` with an empty list, so an opened resource renders its real empty state instead of a network error. A request the mock network has no handler for now fails the test that made it (listing the requests) instead of printing a warning; `takeUnhandledRequests()` exposes the record.
