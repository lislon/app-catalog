---
'@igstack/app-catalog-backend-core': patch
---

Drop the unused `@better-auth/prisma-adapter` dependency

`backend-core` imports `prismaAdapter` from `better-auth/adapters/prisma`, which
better-auth serves out of its own hard dependency on the adapter -- the direct
declaration here was never imported by anything. It was not harmless: a consumer
resolving it independently of better-auth's exact pin gets a second physical copy of
the adapter in the image, on a version whose peer range disagrees with the one
better-auth installed, which is where the unmet-peer warning on every install was
coming from.
