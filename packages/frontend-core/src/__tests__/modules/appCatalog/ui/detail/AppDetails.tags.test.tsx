import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stubs as the section-order test: AppDetails drags the whole panel data
// layer in and none of it decides which tags are shown.
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

const app = (tags: string[]) =>
  ({
    id: 'alation',
    slug: 'alation',
    displayName: 'Alation',
    description: 'Data catalog for analysts.',
    tags,
  }) as Resource

// `namespace:value` tags are indexing machinery — grouping, faceting, placement.
// They are roughly half of all tag references and say nothing about what an app
// is for, so the colon is the test for "not for the reader".
describe('AppDetails — tags', () => {
  it('shows plain tags and hides namespaced ones', () => {
    render(
      <AppDetails
        app={app([
          'category:project-management',
          'jira',
          'placement:day-to-day',
        ])}
        onClosePanel={vi.fn()}
      />,
    )

    expect(screen.getByText('jira')).toBeInTheDocument()
    expect(screen.queryByText('category:project-management')).toBeNull()
    expect(screen.queryByText('placement:day-to-day')).toBeNull()
  })

  it('drops the whole section when every tag is namespaced', () => {
    render(
      <AppDetails
        app={app(['category:internal', 'team:platform'])}
        onClosePanel={vi.fn()}
      />,
    )

    // An empty "Tags" heading is worse than no heading: it reads as missing data.
    expect(screen.queryByRole('heading', { name: 'Tags' })).toBeNull()
  })
})
