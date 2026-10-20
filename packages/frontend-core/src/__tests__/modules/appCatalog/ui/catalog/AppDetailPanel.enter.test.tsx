import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stubs as the AppDetails tags test: the body drags the whole panel data
// layer in and none of it decides where focus lands.
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
vi.mock('~/modules/auth', () => ({
  useUser: vi.fn(() => null),
  useOptionalUser: vi.fn(() => null),
}))
vi.mock('~/modules/appCatalog/ui/detail/CommunitySection', () => ({
  CommunitySection: () => <div />,
}))
vi.mock('~/modules/appCatalog/ui/detail/useOpenFeedbackCount', () => ({
  useOpenFeedbackCount: () => 0,
}))
vi.mock('~/modules/appCatalog/ui/components/SubResourceDetailPanel', () => ({
  SubResourceDetailPanel: () => null,
}))

const { AppDetailPanel } =
  await import('~/modules/appCatalog/ui/catalog/AppDetailPanel')

// Enter on a search result opens the card; a second Enter has to take the
// reader into the app. Focus on the door makes that the browser's own link
// activation, so nothing here presses a key — jsdom does not follow links.
describe('AppDetailPanel — focus on open', () => {
  it('puts focus on the door, so the next Enter opens the app', () => {
    render(
      <AppDetailPanel
        app={{
          id: 'tracker',
          slug: 'tracker',
          displayName: 'Tracker',
          appUrl: 'https://tracker.example.com',
        }}
        onClose={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('link', { name: /Open Tracker in a new tab/ }),
    ).toHaveFocus()
  })

  it('focuses the dialog itself when the app has no address', () => {
    render(
      <AppDetailPanel
        app={{ id: 'tracker', slug: 'tracker', displayName: 'Tracker' }}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveFocus()
  })
})
