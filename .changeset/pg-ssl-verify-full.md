---
'@igstack/app-catalog-backend-core': minor
---

Add `buildPgSslConfig()` and apply it when creating the pg pool, so DB TLS is
driven by `PGSSLMODE`/`PGSSLROOTCERT` correctly. node-postgres does not honor
those on a connection-string pool (it maps `verify-full` to a bare `ssl:true`
and ignores the CA), so a server cert signed by a private CA (e.g. AWS RDS)
could not be verified. The helper builds the `ssl` object explicitly:
verify-full validates CA chain + hostname; verify-ca skips hostname;
require/prefer validate when a CA is given; no-verify encrypts without
validation; disable/unset leaves SSL off. Exported for downstream reuse.
