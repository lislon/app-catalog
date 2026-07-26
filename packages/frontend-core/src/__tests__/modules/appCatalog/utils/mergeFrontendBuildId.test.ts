import { describe, expect, it } from 'vitest'
import { mergeFrontendBuildId } from '~/modules/appCatalog/context/mergeFrontendBuildId'

describe('mergeFrontendBuildId', () => {
  it('returns versions unchanged when no build id', () => {
    const versions = { frontend: { displayName: '0.4.0', sha: 'abc1234' } }
    expect(mergeFrontendBuildId(versions, undefined)).toEqual(versions)
  })

  it('shows local (dropping SHA) when build id is local', () => {
    const versions = { frontend: { displayName: '0.4.0', sha: 'abc1234' } }
    const out = mergeFrontendBuildId(versions, 'local')
    expect(out.frontend).toEqual({ displayName: 'local' })
  })

  it('prepends pipeline id while preserving fe-core version + sha + url', () => {
    const versions = {
      frontend: {
        displayName: '0.4.0-alpha-x',
        sha: 'abc1234',
        shaUrl: 'https://github.com/lislon/app-catalog/commit/abc1234',
      },
    }
    const out = mergeFrontendBuildId(versions, '12345')
    expect(out.frontend?.displayName).toBe('#12345 · 0.4.0-alpha-x')
    expect(out.frontend?.sha).toBe('abc1234')
    expect(out.frontend?.shaUrl).toBe(
      'https://github.com/lislon/app-catalog/commit/abc1234',
    )
  })

  it('shows only pipeline id when backend gave no frontend slot', () => {
    const out = mergeFrontendBuildId({}, '12345')
    expect(out.frontend).toEqual({ displayName: '#12345' })
  })

  it('does not mutate the input', () => {
    const versions = { frontend: { displayName: '0.4.0' } }
    mergeFrontendBuildId(versions, '99')
    expect(versions.frontend.displayName).toBe('0.4.0')
  })
})
