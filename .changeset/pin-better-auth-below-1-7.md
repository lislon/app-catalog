---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-backend-core': patch
---

Cap the `better-auth` dependency below 1.7.0

1.7.0 dropped the `genericOAuthClient` export from `better-auth/client/plugins`, which
`modules/auth/authClient.ts` imports. The dependency was declared as `^1.4.18`, and that
caret range ships in the published packages — so any consumer that installs without a
lockfile resolves 1.7.0 and its bundler fails the build on the missing export
(`"genericOAuthClient" is not exported by better-auth/dist/client/plugins/index.mjs`).

The range is now `>=1.4.18 <1.7.0`, which keeps patch and minor updates flowing while
excluding the breaking release. Raise the cap when `authClient` migrates to the 1.7
entry point.
