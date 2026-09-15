---
'@igstack/app-catalog-frontend-core': patch
---

Launch buttons: accessible name now contains the visible text, plus the full URL on hover

The `Open <host>` buttons on an app's detail page and on a sub-resource's detail
page set `aria-label="Open <name>"`, which replaced the visible label rather than
containing it. That fails WCAG 2.5.3 (Label in Name): someone driving the UI by
voice says the words they can see, and those words were absent from the
accessible name. Both buttons now use the wording the catalog grid already used
-- `Open <name> in a new tab (<host>)` -- and carry a `title`, so the
destination is still discoverable once CSS truncates it.

The scheme-stripping used for display moved into one `displayUrl` helper. Five of
its nine copies were unanchored (`/https?:\/\//g`), which mangled URLs that embed
another URL in a query parameter -- an IAM Identity Center deep link ending in
`&destination=https://console.aws.amazon.com/...` displayed a destination that
does not exist.
