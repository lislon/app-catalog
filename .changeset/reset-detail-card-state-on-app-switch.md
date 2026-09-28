---
'@igstack/app-catalog-frontend-core': patch
---

Reset the detail card's per-app state when it navigates from one app to
another. Following "View replacement" or an access prerequisite's parent
swaps the app in place, and nothing down to the roles table was keyed by
it, so the next app arrived with the previous one's expanded roles table
(pushing its approvers and post-approval steps below the fold), a carried
over icon/screenshot error flag, a leftover draft source edit, and the
previous scroll offset. The card body is now keyed by the resource it
shows.
