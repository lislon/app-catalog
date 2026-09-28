---
'@igstack/app-catalog-backend-core': patch
---

Derive the sign-in provider list from the providers better-auth actually resolved

`getProviders` read the static `betterAuthOptions`, so it listed every configured
provider whether or not the server could serve it. Since better-auth 1.7 the
generic OAuth plugin resolves OIDC discovery once, in its `init`, and silently
skips a provider whose discovery document failed to load — for the whole life of
that process, with no retry. The sign-in page kept offering the button and the
click answered `404 Provider not found`, which reads as a frontend bug and, with
more than one replica, only on some of them.

It now reads `auth.$context`, which holds both built-in social providers and the
generic ones that survived discovery. A provider the server cannot serve is no
longer offered.
