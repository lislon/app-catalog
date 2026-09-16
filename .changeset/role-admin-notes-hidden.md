---
'@igstack/app-catalog-frontend-core': patch
---

Roles table no longer prints a role's internal admin notes

`Role.adminNotes` holds provisioning detail -- directory group names, the SSO app,
grant type, manual steps -- and is documented as never shown to the requester. The
"Available Roles" table rendered it inline under each role's description, with no
auth check or admin flag, so it reached everyone who could open the page. The cell
now shows `description` alone (falling back to an em-dash when a role has no
description).

Where the capability list currently lives in `adminNotes` rather than
`description`, that content is not displayed until it moves to `description` --
tracked separately, since it is a data change rather than a rendering one.
