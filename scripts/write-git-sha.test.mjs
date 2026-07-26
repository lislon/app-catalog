import { describe, it, expect } from 'vitest'
import { applyGitSha } from './write-git-sha.mjs'

describe('applyGitSha', () => {
  it('sets gitHead on each package json', () => {
    const out = applyGitSha(
      [{ path: 'a', json: { name: 'x', version: '1.0.0' } }],
      'abc123',
    )
    expect(out[0].json.gitHead).toBe('abc123')
    expect(out[0].json.version).toBe('1.0.0') // unchanged
  })
  it('overwrites a pre-existing gitHead', () => {
    const out = applyGitSha([{ path: 'a', json: { gitHead: 'old' } }], 'new')
    expect(out[0].json.gitHead).toBe('new')
  })
})
