---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Opening a sub-resource from search results now lands on it

Clicking a matched sub-resource used to open its parent with all siblings listed,
so a query matching 47 accounts buried the one row that was clicked. Two states
now exist: `?sub=<slug>` shows the parent with its table singled out to that
child, and `/app/<slug>/sub/<child>` is the child's own page with its two-step
access chain. Sub-resource rows in the parent's table are real links, and the
result counter now counts matched sub-resources instead of reporting a parent
found through 47 matching children as "1 result".

A sub-resource that documents access through approvers/comments rather than an
approval method now renders its access section instead of nothing.

The search box no longer restores a query from a previous page load.

The test kit gains a Cucumber layer: `@igstack/app-catalog-test-kit/cucumber`
provides step definitions over the existing `given()` harness, so `.feature`
files can drive the real app in jsdom. Register a fixture with
`registerCatalog(name, magazine)` and reference it from
`Given the "<name>" catalog`.
