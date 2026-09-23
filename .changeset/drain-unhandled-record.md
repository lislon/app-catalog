---
'@igstack/app-catalog-test-kit': patch
---

The harness drains its record of unhandled requests even when teardown throws, so a failing cleanup can no longer carry one test's unhandled requests into the next test's report.
