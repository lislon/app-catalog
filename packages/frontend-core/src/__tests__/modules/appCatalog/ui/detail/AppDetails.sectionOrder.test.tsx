import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// AppDetails drags the whole panel data layer in; none of it affects section
// order, so the hooks and the fetching children are stubbed.
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  // Quick Jump keeps its destination in the url, so the panel reads the router
  // even on an app with no jumps to show.
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({ state: { location: { pathname: '/' } } })),
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
  id: 'alation',
  slug: 'alation',
  displayName: 'Alation',
  description: 'Data catalog for analysts.',
  accessRequest: { approvalMethodSlug: 'service' },
} as Resource

// The description says what the app is; "How to get access" only matters once
// you have decided you want it. Access used to render above the description, so
// the panel opened on paperwork.
describe('AppDetails — section order', () => {
  it('renders Description before the access instructions', () => {
    render(<AppDetails app={app} onClosePanel={vi.fn()} />)

    const description = screen.getByRole('heading', { name: 'Description' })
    const access = screen.getByRole('heading', { name: /how to get access/i })

    expect(
      description.compareDocumentPosition(access) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
