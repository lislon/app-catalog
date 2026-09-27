---
'@igstack/app-catalog-frontend-core': patch
'@igstack/app-catalog-backend-core': patch
---

Move to better-auth 1.7 and drop the version cap

1.7 rebuilt the generic OAuth plugin on top of the social-provider path, so the
`genericOAuthClient()` client plugin no longer exists -- and is no longer needed.
It was a type-only shim with no runtime behaviour, and the sign-in call for a
generic provider is now the same `signIn.social({ provider })` the built-in
providers use. Removing it lifts the `better-auth: '>=1.4.18 <1.7.0'` cap that
was pinning consumers a whole minor behind, along with the unmet-peer warnings
that `@better-auth/prisma-adapter` printed on every install.

Two notes for anyone upgrading a deployment:

- The OAuth callback route moved from `/api/auth/oauth2/callback/:providerId` to
  `/api/auth/callback/:providerId`, so the redirect URI registered with the
  identity provider has to be updated.
- PKCE now defaults to on, and `issuer` / `requireIssuerValidation` are gone from
  the generic OAuth config -- issuer validation is automatic.
