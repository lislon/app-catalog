---
'@igstack/app-catalog-backend-core': patch
---

A tRPC request that fails because of the caller (unknown procedure path, bad input, no session) is now logged as one plain `info` line on stdout. Only server-side failures (5xx) keep the `[tRPC Error]` record with a stack on stderr, so a probe at a guessed URL no longer shows up in log collectors as an error.
