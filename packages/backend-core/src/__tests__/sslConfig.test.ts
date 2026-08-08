import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildPgSslConfig } from '../db/sslConfig'

const CA_PEM =
  '-----BEGIN CERTIFICATE-----\nMIIB...fake...\n-----END CERTIFICATE-----\n'

describe('buildPgSslConfig', () => {
  let dir: string
  let caPath: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sslcfg-'))
    caPath = join(dir, 'ca.pem')
    writeFileSync(caPath, CA_PEM)
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const env = (over: Record<string, string | undefined>): NodeJS.ProcessEnv =>
    over as NodeJS.ProcessEnv

  it('returns undefined when PGSSLMODE is unset (leave pg defaults)', () => {
    expect(buildPgSslConfig(env({}))).toBeUndefined()
  })

  it('returns false for disable', () => {
    expect(buildPgSslConfig(env({ PGSSLMODE: 'disable' }))).toBe(false)
  })

  it('verify-full loads the CA and keeps full validation', () => {
    const ssl = buildPgSslConfig(
      env({ PGSSLMODE: 'verify-full', PGSSLROOTCERT: caPath }),
    )
    expect(ssl).toMatchObject({ ca: CA_PEM, rejectUnauthorized: true })
    // verify-full must NOT disable hostname checking
    expect(
      (ssl as { checkServerIdentity?: unknown }).checkServerIdentity,
    ).toBeUndefined()
  })

  it('verify-full throws without a CA (would silently use system store otherwise)', () => {
    expect(() => buildPgSslConfig(env({ PGSSLMODE: 'verify-full' }))).toThrow(
      /PGSSLROOTCERT/,
    )
  })

  it('verify-ca validates the chain but skips hostname', () => {
    const ssl = buildPgSslConfig(
      env({ PGSSLMODE: 'verify-ca', PGSSLROOTCERT: caPath }),
    ) as {
      ca: string
      rejectUnauthorized: boolean
      checkServerIdentity: () => unknown
    }
    expect(ssl.ca).toBe(CA_PEM)
    expect(ssl.rejectUnauthorized).toBe(true)
    expect(typeof ssl.checkServerIdentity).toBe('function')
    expect(ssl.checkServerIdentity()).toBeUndefined()
  })

  it('no-verify encrypts without validation', () => {
    expect(buildPgSslConfig(env({ PGSSLMODE: 'no-verify' }))).toEqual({
      rejectUnauthorized: false,
    })
  })

  it('require without a CA does not validate', () => {
    expect(buildPgSslConfig(env({ PGSSLMODE: 'require' }))).toEqual({
      rejectUnauthorized: false,
    })
  })

  it('require WITH a CA validates the chain (verify-ca-like)', () => {
    const ssl = buildPgSslConfig(
      env({ PGSSLMODE: 'require', PGSSLROOTCERT: caPath }),
    ) as { ca: string; rejectUnauthorized: boolean }
    expect(ssl.ca).toBe(CA_PEM)
    expect(ssl.rejectUnauthorized).toBe(true)
  })

  it('throws a clear error when the CA path is unreadable', () => {
    expect(() =>
      buildPgSslConfig(
        env({ PGSSLMODE: 'verify-full', PGSSLROOTCERT: '/no/such/ca.pem' }),
      ),
    ).toThrow(/could not be read/)
  })
})
