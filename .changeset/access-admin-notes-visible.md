---
'@igstack/app-catalog-frontend-core': minor
'@igstack/app-catalog-test-kit': minor
---

Access tab shows admin notes again, at both levels

Two readers open an entry's access tab: one wants in, the other has to let them
in. For many entries the only written record of HOW a role is granted -- the
directory group, the pipeline to run -- lives in admin notes, and neither level
of them was rendered, so the second reader got a page with nothing on it for
them and no second page to go to.

- `Role.adminNotes` is back as a `Note:` line under the role's description in
  the Available Roles table. A role with no description still gets the em-dash,
  so the note can never read as the description.
- The entry's own `adminNotes` -- served as `Resource.notes`, stored and synced
  but rendered nowhere until now -- gets its own "Admin notes" block after the
  roles table, and also renders on an entry that has no access request at all,
  where it is the only thing on the page that says how access is granted.

Both levels are guarded by a Cucumber feature in the test kit
(`accessAdminNotes.feature`), whose fixture now carries roles with group names
and an entry-level note.
