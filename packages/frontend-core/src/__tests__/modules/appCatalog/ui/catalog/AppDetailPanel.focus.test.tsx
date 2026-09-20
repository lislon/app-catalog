import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The panel's own contents are not what this test is about — only whether the
// panel lets a child keep the caret. Stands in for the Quick Jump field.
vi.mock('~/modules/appCatalog/ui/detail/AppDetails', () => ({
  AppDetails: () => {
    const ref = React.useRef<HTMLInputElement>(null)
    React.useEffect(() => ref.current?.focus(), [])
    return <input ref={ref} aria-label="case id" />
  },
}))
vi.mock('~/modules/appCatalog/ui/components/SubResourceDetailPanel', () => ({
  SubResourceDetailPanel: () => null,
}))
vi.mock('~/modules/appCatalog/context/AppCatalogContext', () => ({
  useAppCatalogContext: vi.fn(() => ({ approvalMethods: [] })),
}))

const { AppDetailPanel } =
  await import('~/modules/appCatalog/ui/catalog/AppDetailPanel')

const app = { slug: 'tracker', displayName: 'Tracker' } as Resource

describe('AppDetailPanel — focus on open', () => {
  // The card focuses itself so Esc works when it was opened by a mouse click.
  // A child that already took the caret has the better claim on it.
  it('leaves focus where a child put it', () => {
    render(<AppDetailPanel app={app} onClose={vi.fn()} />)

    expect(screen.getByLabelText('case id')).toHaveFocus()
  })
})
