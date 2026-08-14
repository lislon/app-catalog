---
'@igstack/app-catalog-backend-core': patch
'@igstack/app-catalog-frontend-core': patch
---

Pin the `ai` and `@ai-sdk/*` dependencies to exact versions, and drop `ai` and
`@ai-sdk/react` from `frontend-core`, where neither was imported.

Those packages publish several times a day and hard-pin each other exactly, so a
caret range resolved to a release that could be minutes old — faster than npm's
registry metadata becomes consistent. Fresh installs failed intermittently with
`ERR_PNPM_NO_MATCHING_VERSION` on a transitive `@ai-sdk` package that was in fact
published. Exact versions in the published `dependencies` make the resolution
deterministic for consumers too, which a root `overrides` block cannot do.
