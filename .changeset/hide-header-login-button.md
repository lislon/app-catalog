---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-test-kit': patch
---

Header no longer shows a Login button to anonymous visitors, and the login route renders again

The catalog is fully browsable without signing in, so the header's "Login" button
mostly advertised a flow most visitors have no reason to enter. The button is
removed rather than hidden behind a flag: a permanently-false flag is dead code
that the lint rules reject, and `git revert` of this commit brings the button back
as it was.

This is a visibility change only. The login modal, the auth client, session
handling, route guards and the signed-in user menu (avatar and sign-out) are all
untouched. `LoginModal` is still mounted app-wide by `TopLevelProviders`, so
`useAuthModal().open()` still opens it from anywhere, and the header still switches
to the user menu once a visitor signs in. `DEV Login` is unchanged and still
appears when the backend reports `devLoginEnabled`.

The wrapper `div` that held the two anonymous-state buttons is gone along with the
button: as an empty flex child it would still have consumed the header row's
`gap-3`, leaving a visible gap where the button used to be.

The `/login` route now renders `LoginPage` directly instead of `LoginModal`. The
modal only renders while `AuthModalContext` reports itself open, and nothing opens
it when the route is entered by URL, so the route rendered a blank page. With the
header button gone the route is the URL-reachable entry to the flow, so it has to
render on its own.
