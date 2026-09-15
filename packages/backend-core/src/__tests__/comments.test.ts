import { describe, expect, it, vi } from 'vitest'
import {
  VISITOR_COOKIE,
  aliasForHash,
  resolveVisitor,
} from '../modules/comments/visitorIdentity'

/**
 * A comment carries no user id — the catalog is browsable logged out. The visitor
 * cookie is therefore the only thing standing between an author editing their own
 * comment and anyone editing anyone's, and the stored alias is the only name a
 * reader ever sees.
 */
describe('visitor identity', () => {
  function reqWith(cookie?: string) {
    return { headers: cookie ? { cookie } : {} }
  }

  it('issues an httpOnly cookie when the browser has none', () => {
    const res = { cookie: vi.fn() }
    const visitor = resolveVisitor(reqWith(), res)

    expect(visitor).not.toBeNull()
    expect(res.cookie).toHaveBeenCalledTimes(1)
    const call = res.cookie.mock.calls[0] ?? []
    expect(call[0]).toBe(VISITOR_COOKIE)
    expect(call[1]).toMatch(/^[0-9a-f-]{36}$/)
    expect(
      call[2],
      'a token page scripts can read is a token anyone can forge',
    ).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
  })

  it('reuses an existing token without re-issuing it', () => {
    const res = { cookie: vi.fn() }
    const visitor = resolveVisitor(
      reqWith(`other=1; ${VISITOR_COOKIE}=fixed-token; another=2`),
      res,
    )

    expect(res.cookie).not.toHaveBeenCalled()
    // sha256('fixed-token')
    expect(visitor?.hash).toHaveLength(64)
    expect(
      resolveVisitor(reqWith(`${VISITOR_COOKIE}=fixed-token`), res)?.hash,
      'the same browser must resolve to the same author every time',
    ).toBe(visitor?.hash)
  })

  it('never stores the raw token as the author key', () => {
    const visitor = resolveVisitor(reqWith(`${VISITOR_COOKIE}=fixed-token`))
    expect(visitor?.hash).not.toContain('fixed-token')
  })

  it('gives a request with no cookie and no response no identity at all', () => {
    // Internally-created contexts have no response to set a cookie on, and must
    // not silently share one identity.
    expect(resolveVisitor(reqWith())).toBeNull()
  })

  it('derives a stable two-word alias, varying both words', () => {
    const alias = aliasForHash('a'.repeat(64))
    expect(alias).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
    expect(aliasForHash('a'.repeat(64))).toBe(alias)

    // The two words come from independent slices of the hash: hashes sharing a
    // first slice must still differ in the second.
    const shared = '00000000'
    expect(aliasForHash(`${shared}00000001${'0'.repeat(48)}`)).not.toBe(
      aliasForHash(`${shared}00000002${'0'.repeat(48)}`),
    )
  })
})
