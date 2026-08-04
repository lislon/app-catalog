import { describe, expect, it } from 'vitest'
import { markdownToPlainText } from '~/modules/appCatalog/utils/markdownToPlainText'

// #25 regression: markdown-bearing text fields (descriptions) are rendered raw
// in compact/clamped surfaces (grid list preview, table row, filter combobox,
// sub-resources). Link syntax like `[Example Portal](/app/example-portal)`
// leaked as literal text. In clamped previews we strip markdown to its visible
// text so nothing leaks and `line-clamp` / search highlighting keep working.
describe('markdownToPlainText', () => {
  it('reduces an internal link to just its text', () => {
    expect(
      markdownToPlainText('See [Example Portal](/app/example-portal) too'),
    ).toBe('See Example Portal too')
  })

  it('reduces an external link to just its text', () => {
    expect(markdownToPlainText('Read the [docs](https://example.com)')).toBe(
      'Read the docs',
    )
  })

  it('handles multiple links in one string', () => {
    expect(
      markdownToPlainText(
        '[Example Portal](/app/example-portal) and [Portal B](/app/portal-b)',
      ),
    ).toBe('Example Portal and Portal B')
  })

  it('strips image syntax to its alt text', () => {
    expect(markdownToPlainText('![logo](/img/logo.png) brand')).toBe(
      'logo brand',
    )
  })

  it('strips bold and italic markers', () => {
    expect(markdownToPlainText('a **bold** and _italic_ word')).toBe(
      'a bold and italic word',
    )
  })

  it('strips inline code backticks', () => {
    expect(markdownToPlainText('run `pnpm build` now')).toBe(
      'run pnpm build now',
    )
  })

  it('leaves plain text untouched', () => {
    expect(markdownToPlainText('just plain text, no markdown')).toBe(
      'just plain text, no markdown',
    )
  })

  it('returns an empty string for empty input', () => {
    expect(markdownToPlainText('')).toBe('')
  })
})
