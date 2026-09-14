import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import type { AppVersionInfo } from '@igstack/app-catalog-backend-core'
import { VersionPopover } from '~/ui/components/header/Header'

const versions: AppVersionInfo = {
  backend: {
    displayName: '#123',
    url: 'https://example.test/pipeline/123',
    sha: 'abc1234',
    shaUrl: 'https://example.test/commit/abc1234',
  },
  coreVersion: { displayName: '0.18.6' },
  frontend: { displayName: 'fe-build-42' },
}

describe('VersionPopover', () => {
  it('hides the version detail until the trigger is clicked', () => {
    render(<VersionPopover versions={versions} />)

    expect(screen.queryByText(/0\.18\.6/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('version-info-trigger'))

    expect(screen.getByRole('link', { name: '#123' })).toBeInTheDocument()
    expect(screen.getByText('Core')).toBeInTheDocument()
    expect(screen.getByText('0.18.6')).toBeInTheDocument()
    expect(screen.getByText('FE')).toBeInTheDocument()
    expect(screen.getByText('fe-build-42')).toBeInTheDocument()
    expect(screen.getByText('(abc1234)')).toBeInTheDocument()
  })

  it('renders the pipeline link with the existing href', () => {
    render(<VersionPopover versions={versions} />)
    fireEvent.click(screen.getByTestId('version-info-trigger'))

    expect(screen.getByRole('link', { name: '#123' })).toHaveAttribute(
      'href',
      'https://example.test/pipeline/123',
    )
  })

  it('closes when the close button is clicked', () => {
    render(<VersionPopover versions={versions} />)
    fireEvent.click(screen.getByTestId('version-info-trigger'))
    expect(screen.getByText('0.18.6')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('0.18.6')).not.toBeInTheDocument()
  })

  it('renders "local" without a popover when running local-only', () => {
    render(<VersionPopover versions={{ backend: { displayName: 'local' } }} />)
    expect(screen.getByText('local')).toBeInTheDocument()
    expect(screen.queryByTestId('version-info-trigger')).not.toBeInTheDocument()
  })
})
