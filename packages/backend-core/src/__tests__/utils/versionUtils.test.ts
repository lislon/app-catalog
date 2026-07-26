import { describe, expect, it } from 'vitest'
import { getCommitUrl, shortSha } from '../../utils/versionUtils.js'

describe('shortSha', () => {
  it('returns first 7 chars', () => {
    expect(shortSha('abcdef1234567890')).toBe('abcdef1')
  })
  it('returns undefined for empty', () => {
    expect(shortSha(undefined)).toBeUndefined()
    expect(shortSha(null)).toBeUndefined()
    expect(shortSha('')).toBeUndefined()
  })
})

describe('getCommitUrl', () => {
  it('builds a github commit url', () => {
    expect(
      getCommitUrl('https://github.com/lislon/app-catalog', 'abc1234'),
    ).toBe('https://github.com/lislon/app-catalog/commit/abc1234')
  })
  it('strips a trailing slash from homepage', () => {
    expect(getCommitUrl('https://github.com/lislon/app-catalog/', 'abc')).toBe(
      'https://github.com/lislon/app-catalog/commit/abc',
    )
  })
  it('returns undefined without homepage or sha', () => {
    expect(getCommitUrl(undefined, 'abc')).toBeUndefined()
    expect(getCommitUrl('https://x', undefined)).toBeUndefined()
  })
})
