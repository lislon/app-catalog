import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stubs as the section-order test: the panel's data layer has no bearing on
// whether one optional section renders.
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    state: { location: { pathname: '/', search: {} } },
  })),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}))
vi.mock('~/modules/appCatalog/context/AppCatalogContext', () => ({
  useAppCatalogContext: vi.fn(() => ({ approvalMethods: [], resources: [] })),
}))
vi.mock('~/modules/appCatalog/hooks/useAppClickHistory', () => ({
  useAppClickHistory: vi.fn(() => ({ recordClick: vi.fn() })),
}))
vi.mock('~/modules/appCatalog/hooks/useUpdateApp', () => ({
  useUpdateApp: vi.fn(() => ({ mutate: vi.fn() })),
}))
vi.mock('~/modules/appCatalog/ui/context/AppCatalogFiltersContext', () => ({
  useAppCatalogFilters: vi.fn(() => ({ selectedTags: [], toggleTag: vi.fn() })),
}))
vi.mock('~/modules/auth', () => ({ useUser: vi.fn(() => null) }))
vi.mock('~/modules/appCatalog/ui/detail/CommentsSection', () => ({
  CommentsSection: () => <div />,
}))

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')

const app = {
  id: 'provider-portal',
  slug: 'provider-portal',
  displayName: 'Provider Portal',
  description: 'Order tests and read results.',
  background: 'Built around 2015 for the clinic-facing side of one business.',
} as Resource

describe('AppDetails — Background', () => {
  it('renders the history after the description, not instead of it', () => {
    render(<AppDetails app={app} onClosePanel={vi.fn()} />)

    const description = screen.getByRole('heading', { name: 'Description' })
    const background = screen.getByRole('heading', { name: 'Background' })

    expect(
      screen.getByText(/Built around 2015 for the clinic-facing side/),
    ).toBeInTheDocument()
    expect(
      description.compareDocumentPosition(background) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('leaves no empty section when the entry has no history recorded', () => {
    const { background: _omitted, ...withoutBackground } = app
    render(
      <AppDetails app={withoutBackground as Resource} onClosePanel={vi.fn()} />,
    )

    expect(screen.queryByRole('heading', { name: 'Background' })).toBeNull()
  })
})
