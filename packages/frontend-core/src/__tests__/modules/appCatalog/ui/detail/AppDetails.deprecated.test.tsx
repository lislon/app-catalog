import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { UiSettingsContext } from '~/context/UiSettingsContext'

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    state: { location: { pathname: '/app/old-tool', search: {} } },
  })),
  useRouterState: vi.fn(() => '/app/old-tool'),
  Link: ({
    children,
    params,
  }: {
    children?: React.ReactNode
    params?: { slug: string }
  }) => <a href={`/app/${params?.slug}`}>{children}</a>,
}))
vi.mock('~/modules/appCatalog/context/AppCatalogContext', () => ({
  useAppCatalogContext: vi.fn(() => ({
    approvalMethods: [],
    resources: [{ id: 'new-tool', slug: 'new-tool', displayName: 'New Tool' }],
  })),
}))
vi.mock('~/modules/appCatalog/hooks/useAppClickHistory', () => ({
  useAppClickHistory: vi.fn(() => ({ recordClick: vi.fn() })),
}))
vi.mock('~/modules/appCatalog/ui/detail/useCommunityToolCount', () => ({
  useCommunityToolCount: vi.fn(() => 0),
}))
vi.mock('~/modules/appCatalog/hooks/useUpdateApp', () => ({
  useUpdateApp: vi.fn(() => ({ mutate: vi.fn() })),
}))
vi.mock('~/modules/appCatalog/ui/context/AppCatalogFiltersContext', () => ({
  useAppCatalogFilters: vi.fn(() => ({
    state: { searchValue: '' },
    actions: {},
  })),
}))
vi.mock('~/modules/auth', () => ({ useUser: vi.fn(() => null) }))
vi.mock('~/modules/appCatalog/ui/detail/CommunitySection', () => ({
  CommunitySection: () => <div />,
}))
vi.mock('~/modules/appCatalog/ui/detail/usePendingCount', () => ({
  usePendingCount: () => 0,
}))

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')

const app = {
  id: 'old-tool',
  slug: 'old-tool',
  displayName: 'Old Tool',
  description: 'Does a thing.',
  deprecated: {
    type: 'discouraged',
    comment:
      'Being sunset in favor of [New Tool](/app/new-tool). Ask in #tools-help.',
  },
} as Resource

// The comment is where an author says what to use instead and where to ask,
// so it gets the same markdown as the description: catalog links and channel
// mentions have to be pressable, not raw `[text](url)`.
describe('AppDetails — deprecation comment', () => {
  it('renders catalog links and channel mentions as links', () => {
    render(
      <UiSettingsContext
        value={{ chatChannelUrlTemplate: 'https://chat.example.com/{name}' }}
      >
        <AppDetails app={app} />
      </UiSettingsContext>,
    )

    expect(screen.getByRole('link', { name: 'New Tool' })).toHaveAttribute(
      'href',
      '/app/new-tool',
    )
    expect(screen.getByRole('link', { name: '#tools-help' })).toHaveAttribute(
      'href',
      'https://chat.example.com/tools-help',
    )
    expect(screen.queryByText(/\]\(/)).toBeNull()
  })
})
