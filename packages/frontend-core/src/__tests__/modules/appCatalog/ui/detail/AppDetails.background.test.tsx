import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
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
vi.mock('~/modules/appCatalog/ui/detail/FeedbackSection', () => ({
  FeedbackSection: () => <div />,
}))

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')

const app = {
  id: 'provider-portal',
  slug: 'provider-portal',
  displayName: 'Provider Portal',
  description: 'Order tests and read results.',
  background: 'Built around 2015 for the clinic-facing side of one business.',
} as Resource

// The original contract was positional — history AFTER the description, never
// instead of it — and the card has since split those two across tabs, so no
// single DOM holds both. The intent survives unchanged: the description is what
// the card opens on, and the history is somewhere quieter that you choose to
// visit. That is what these assert now.
describe('AppDetails — Background', () => {
  it('opens on the description, not on the history', () => {
    render(<AppDetails app={app} onClosePanel={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Description' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Background' })).toBeNull()
  })

  it('renders the history under Documentation', async () => {
    render(<AppDetails app={app} onClosePanel={vi.fn()} />)

    fireEvent.click(screen.getByRole('tab', { name: /documentation/i }))

    expect(screen.getByRole('heading', { name: 'Background' })).toBeVisible()
    expect(
      screen.getByText(/Built around 2015 for the clinic-facing side/),
    ).toBeInTheDocument()
  })

  // Asserted ON the Documentation tab on purpose. Asserting it from Overview would
  // pass whether or not the section works, because Background is in another
  // panel either way — a test that cannot fail is worse than no test.
  it('leaves no empty section when the entry has no history recorded', () => {
    const { background: _omitted, ...withoutBackground } = app
    render(
      <AppDetails app={withoutBackground as Resource} onClosePanel={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('tab', { name: /documentation/i }))

    expect(screen.queryByRole('heading', { name: 'Background' })).toBeNull()
    // Proves the panel really is open, so the absence above means something.
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeVisible()
  })
})
