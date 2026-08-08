import { readFileSync } from 'node:fs'
import type { ConnectionOptions } from 'node:tls'

/**
 * Build the node-postgres `ssl` PoolConfig option from libpq-style env vars,
 * because node-postgres does NOT do this correctly on its own for a
 * connection-string pool: its built-in env handling maps `PGSSLMODE=verify-full`
 * to a bare `ssl: true` (Node's default trust store) and IGNORES `PGSSLROOTCERT`
 * — so an RDS server cert signed by the Amazon RDS CA would fail to verify.
 *
 * We therefore construct the `ssl` object explicitly and pass it to `new
 * pg.Pool({ connectionString, ssl })`. Semantics mirror libpq / pg-connection-string:
 *   - verify-full → validate CA chain AND hostname (Node defaults; no overrides)
 *   - verify-ca   → validate CA chain, skip hostname (checkServerIdentity no-op)
 *   - require/prefer → encrypt but don't validate (unless a CA is given → verify-ca-like)
 *   - no-verify   → encrypt, don't validate (rejectUnauthorized:false)
 *   - disable / unset → no TLS
 *
 * `PGSSLROOTCERT` points at a CA bundle on disk (e.g. the Amazon RDS
 * global-bundle.pem baked into the image).
 *
 * @returns a `ConnectionOptions` object, `false` for disabled, or `undefined`
 *          to leave SSL unset (let node-postgres fall back to its defaults).
 */
export function buildPgSslConfig(
  env: NodeJS.ProcessEnv = process.env,
): ConnectionOptions | boolean | undefined {
  const mode = env.PGSSLMODE
  const rootCertPath = env.PGSSLROOTCERT

  const readCa = (): string | undefined => {
    if (!rootCertPath) return undefined
    try {
      return readFileSync(rootCertPath, 'utf8')
    } catch (err) {
      throw new Error(
        `PGSSLROOTCERT is set to "${rootCertPath}" but the CA bundle could not be read: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  switch (mode) {
    case 'disable':
      return false

    case 'verify-full': {
      const ca = readCa()
      if (!ca) {
        throw new Error(
          'PGSSLMODE=verify-full requires PGSSLROOTCERT to point at a CA bundle ' +
            '(node-postgres would otherwise use the system trust store, which does ' +
            'not include the Amazon RDS CA). Set PGSSLROOTCERT.',
        )
      }
      // Node defaults: rejectUnauthorized=true (CA chain) + checkServerIdentity
      // (hostname). That IS verify-full.
      return { ca, rejectUnauthorized: true }
    }

    case 'verify-ca': {
      const ca = readCa()
      if (!ca) {
        throw new Error(
          'PGSSLMODE=verify-ca requires PGSSLROOTCERT to point at a CA bundle.',
        )
      }
      // Validate the CA chain but skip hostname matching.
      return {
        ca,
        rejectUnauthorized: true,
        checkServerIdentity: () => undefined,
      }
    }

    case 'require':
    case 'prefer': {
      const ca = readCa()
      // With a CA, behave like verify-ca (validate chain, skip hostname);
      // without one, encrypt but don't validate.
      return ca
        ? { ca, rejectUnauthorized: true, checkServerIdentity: () => undefined }
        : { rejectUnauthorized: false }
    }

    case 'no-verify':
      return { rejectUnauthorized: false }

    default:
      // Unset / unknown: leave SSL unset so callers/pg keep prior behavior.
      return undefined
  }
}
