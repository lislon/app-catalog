import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// AppDetails drags the whole panel data layer in; none of it affects section
// order, so the hooks and the fetching children are stubbed.
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  // Quick Jump keeps its destination in the url, so the panel reads the router
  // even on an app with no jumps to show.
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
  id: 'alation',
  slug: 'alation',
  displayName: 'Alation',
  description: 'Data catalog for analysts.',
  accessRequest: { approvalMethodSlug: 'service' },
} as Resource

// The description says what the app is; "How to get access" only matters once
// you have decided you want it. Access used to render above the description, so
// the panel opened on paperwork.
//
// That ordering is now a tab order rather than a DOM order — the two are never
// mounted together — so these assert the same guarantee in the new shape: the
// card opens on what the app IS, and the paperwork is one deliberate click
// away. Checking that the access panel is absent until asked for is the part
// that would have silently regressed if this test had simply been deleted.
describe('AppDetails — section order', () => {
  it('opens on the description, with the access instructions not yet mounted', () => {
    render(<AppDetails app={app} onClosePanel={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Description' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: /how to get access/i }),
    ).toBeNull()
  })

  it('reaches the access instructions from its own tab', () => {
    render(<AppDetails app={app} onClosePanel={vi.fn()} />)

    fireEvent.click(screen.getByRole('tab', { name: /^access/i }))

    expect(screen.getByRole('tab', { name: /^access/i })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Description' })).toBeNull()
  })

  // The tab has to say what the route is before it is opened. With no matching
  // approval method registered there is nothing to name, and claiming a route
  // we cannot describe is the failure the label exists to prevent.
  it('names the access route in the tab', () => {
    render(<AppDetails app={app} onClosePanel={vi.fn()} />)

    expect(
      screen.getByRole('tab', { name: /access — not documented/i }),
    ).toBeVisible()
  })
})
