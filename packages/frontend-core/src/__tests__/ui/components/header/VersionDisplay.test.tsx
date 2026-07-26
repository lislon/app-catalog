import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { VersionDisplay } from '~/ui/components/header/Header'

describe('VersionDisplay footer', () => {
  it('renders the frontend-core version and its short SHA as a commit link', () => {
    render(
      <VersionDisplay
        versions={{
          backend: { displayName: '#12345 (deadbee)' },
          coreVersion: { displayName: 'be 0.4.0 / fe 0.3.1' },
          frontend: {
            displayName: '#12345 · 0.3.1-alpha-x',
            sha: 'abc1234',
            shaUrl: 'https://github.com/lislon/app-catalog/commit/abc1234',
          },
        }}
      />,
    )
    // FE line shows pipeline id + fe-core version
    expect(screen.getByText(/0\.3\.1-alpha-x/)).toBeInTheDocument()
    // SHA rendered and linked to the commit
    const shaLink = screen.getByText('(abc1234)').closest('a')
    expect(shaLink).toHaveAttribute(
      'href',
      'https://github.com/lislon/app-catalog/commit/abc1234',
    )
    // Backend line carries the natera SHA suffix
    expect(screen.getByText(/#12345 \(deadbee\)/)).toBeInTheDocument()
  })

  it('shows plain "local" for local dev', () => {
    render(<VersionDisplay versions={{ backend: { displayName: 'local' } }} />)
    expect(screen.getByText('local')).toBeInTheDocument()
  })
})
