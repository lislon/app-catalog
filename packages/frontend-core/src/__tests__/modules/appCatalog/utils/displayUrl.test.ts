import { describe, expect, it } from 'vitest'

import { displayUrl } from '~/modules/appCatalog/utils/displayUrl'

describe('displayUrl', () => {
  it('drops the leading scheme', () => {
    expect(displayUrl('https://console.aws.amazon.com/')).toBe(
      'console.aws.amazon.com/',
    )
    expect(displayUrl('http://intranet.example')).toBe('intranet.example')
  })

  it('leaves a URL embedded in the query string intact', () => {
    // Unanchored stripping mangled this: the `destination` value lost its
    // scheme too, so the label described a destination that does not exist.
    expect(
      displayUrl(
        'https://portal.example/start/#/console?destination=https://console.aws.amazon.com/s3',
      ),
    ).toBe(
      'portal.example/start/#/console?destination=https://console.aws.amazon.com/s3',
    )
  })

  it('passes through a URL with no scheme', () => {
    expect(displayUrl('portal.example/x')).toBe('portal.example/x')
  })
})
