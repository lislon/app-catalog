import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// `?sub=` is read by AppDetails (to pick the tab) AND by SubResourcesSection
// (to single out the row), so it is set on the shared router mock rather than
// passed in. Everything else in the data layer is stubbed; the chain under test
// is AppDetails -> DetailTabs -> SubResourcesSection.
const search = {
  sub: 'parent-two' as string | undefined,
  tab: undefined as string | undefined,
}

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => search),
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    state: { location: { pathname: '/', search: {} } },
  })),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}))

const parent = {
  id: 'parent',
  slug: 'parent',
  displayName: 'Parent',
  description: 'A resource with children.',
  childrenLabel: 'Accounts',
} as Resource

const children: Resource[] = [
  {
    id: 'parent-one',
    slug: 'parent-one',
    displayName: 'first-child',
    parentSlug: 'parent',
  },
  {
    id: 'parent-two',
    slug: 'parent-two',
    displayName: 'second-child',
    parentSlug: 'parent',
  },
]

vi.mock('~/modules/appCatalog/context/AppCatalogContext', () => ({
  useAppCatalogContext: vi.fn(() => ({
    approvalMethods: [],
    resources: [parent, ...children],
  })),
}))
vi.mock('~/modules/appCatalog/hooks/useAppClickHistory', () => ({
  useAppClickHistory: vi.fn(() => ({ recordClick: vi.fn() })),
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
vi.mock('~/modules/appCatalog/ui/detail/FeedbackSection', () => ({
  FeedbackSection: () => <div />,
}))

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')

// Searching the catalog can match a CHILD — an account id, an alias — and
// clicking that result opens the parent's card with `?sub=<child>`. Landing on
// Overview and leaving the visitor to find the right tab would waste the one
// piece of information their click carried.
describe('AppDetails — arriving with ?sub=', () => {
  it('opens on the children tab, not on Overview', () => {
    render(<AppDetails app={parent} onClosePanel={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /accounts/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('singles out the matched child rather than listing its siblings', () => {
    render(<AppDetails app={parent} onClosePanel={vi.fn()} />)

    expect(screen.getByText(/Showing: second-child/)).toBeInTheDocument()
    expect(screen.queryByText('first-child')).toBeNull()
  })

  // A link carrying both must not show one thing and claim another. `?sub=`
  // names a specific child, which is the more specific intent, so it wins.
  it('wins over a ?tab= that disagrees', () => {
    search.tab = 'metadata'
    try {
      render(<AppDetails app={parent} onClosePanel={vi.fn()} />)
      expect(screen.getByRole('tab', { name: /accounts/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    } finally {
      search.tab = undefined
    }
  })

  it('names the tab from childrenLabel and counts the children', () => {
    render(<AppDetails app={parent} onClosePanel={vi.fn()} />)

    const tab = screen.getByRole('tab', { name: /accounts/i })
    expect(tab).toHaveTextContent('Accounts')
    expect(tab).toHaveTextContent('2')
  })

  it('falls back to a generic label when the parent does not name its children', () => {
    const { childrenLabel: _omitted, ...unnamed } = parent
    render(<AppDetails app={unnamed as Resource} onClosePanel={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /resources/i })).toBeVisible()
  })

  // The tab and the panel it opens have to agree. They used to be independent:
  // the tab read childrenLabel while the panel hard-coded "Sub-Resources", so
  // naming the children renamed the tab and left the heading under it
  // contradicting the tab the user just clicked.
  it('uses childrenLabel for the panel heading and the filter, not just the tab', async () => {
    render(<AppDetails app={parent} onClosePanel={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /accounts/i }))

    expect(await screen.findByText(/^Accounts \(\d+ of \d+\)$/)).toBeVisible()
    expect(screen.queryByText(/Sub-Resources/)).not.toBeInTheDocument()
  })

  it('names the children in the filter placeholder too', async () => {
    // The shared mock pins `?sub=`, which swaps the search box for a dismissible
    // "Showing: …" badge — so the placeholder only exists with no row singled out.
    search.sub = undefined
    try {
      render(<AppDetails app={parent} onClosePanel={vi.fn()} />)
      await userEvent.click(screen.getByRole('tab', { name: /accounts/i }))

      expect(
        await screen.findByPlaceholderText(/Search Accounts by name or alias/i),
      ).toBeVisible()
    } finally {
      search.sub = 'parent-two'
    }
  })

  it('keeps the generic heading when the parent does not name its children', async () => {
    const { childrenLabel: _omitted, ...unnamed } = parent
    render(<AppDetails app={unnamed as Resource} onClosePanel={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /resources/i }))

    expect(
      await screen.findByText(/^Sub-Resources \(\d+ of \d+\)$/),
    ).toBeVisible()
  })
})
