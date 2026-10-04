import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// `navigate` is captured rather than ignored. A stub that swallows the call
// makes the url-writing side of the tabs unreachable from a test, which is how
// a feature ends up claimed and unguarded — `?tab=` deep-linking is the whole
// reason the active tab lives in the url, so it gets asserted here.
const navigate = vi.fn()
const search: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => search),
  useNavigate: vi.fn(() => navigate),
  useRouter: vi.fn(() => ({
    state: { location: { pathname: '/app/thing', search } },
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

const withUrl = {
  id: 'thing',
  slug: 'thing',
  displayName: 'Thing',
  description: 'Does a thing.',
  appUrl: 'https://thing.example.com/portal',
} as Resource

const withoutUrl = {
  id: 'quiet',
  slug: 'quiet',
  displayName: 'Quiet Thing',
  description: 'Has no address on file.',
} as Resource

beforeEach(() => {
  navigate.mockClear()
  for (const key of Object.keys(search)) delete search[key]
})

// A third of the catalog has no `appUrl`. The header used to render a bare em
// dash there, which reads as "the card failed" rather than "there is no
// address" — and a surface that looks pressable but is not would be worse.
describe('the door', () => {
  it('is a link to the app when there is an address', () => {
    render(<AppDetails app={withUrl} onClosePanel={vi.fn()} />)

    const door = screen.getByRole('link', { name: /^Open Thing in a new tab/ })
    expect(door).toHaveAttribute('href', 'https://thing.example.com/portal')
    expect(door).toHaveAttribute('target', '_blank')
    // The name and the address are INSIDE the one control, which is the whole
    // point — the largest thing on the card is the thing you press.
    expect(door).toHaveTextContent('Thing')
    expect(door).toHaveTextContent('thing.example.com/portal')
  })

  it('says so plainly when the entry has no address, and offers nothing to press', () => {
    render(<AppDetails app={withoutUrl} onClosePanel={vi.fn()} />)

    expect(screen.getByText('No URL for this app.')).toBeVisible()
    expect(screen.queryByRole('link', { name: /in a new tab/ })).toBeNull()
  })
})

describe('the tab strip', () => {
  // The reason the active tab lives in the url at all: a card is linkable
  // mid-conversation, and a maintainer's reply on the notes tab is addressable.
  it('writes the selected tab to the url', () => {
    render(<AppDetails app={withUrl} onClosePanel={vi.fn()} />)

    fireEvent.click(screen.getByRole('tab', { name: /^access/i }))

    expect(navigate).toHaveBeenCalled()
    const wroteTab = navigate.mock.calls.some(
      ([arg]) =>
        (arg as { search?: Record<string, unknown> }).search?.tab === 'access',
    )
    expect(wroteTab).toBe(true)
  })

  it('opens on the tab named in the url', () => {
    search.tab = 'documentation'
    render(<AppDetails app={withUrl} onClosePanel={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Documentation' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  // Tab ids travel in links people have already shared, so retiring one has to
  // keep resolving rather than dropping the reader on the first tab.
  it('still honours a retired tab id from an older link', () => {
    search.tab = 'metadata'
    render(<AppDetails app={withUrl} onClosePanel={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Documentation' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  // A stale link, or an entry that lost its children. Falling back beats
  // rendering a card with no panel at all.
  it('falls back to the first tab when the url names one this entry lacks', () => {
    search.tab = 'resources'
    render(<AppDetails app={withUrl} onClosePanel={vi.fn()} />)

    expect(screen.queryByRole('tab', { name: /resources/i })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('heading', { name: 'Description' })).toBeVisible()
  })

  // Per the tablist pattern: one stop in the tab order, arrows move within.
  it('moves between tabs with the arrow keys', () => {
    render(<AppDetails app={withUrl} onClosePanel={vi.fn()} />)

    const overview = screen.getByRole('tab', { name: 'Overview' })
    expect(overview).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(overview, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: /^access/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // Only the selected tab stays reachable by Tab.
    expect(overview).toHaveAttribute('tabindex', '-1')
  })

  it('wraps from the first tab to the last', () => {
    render(<AppDetails app={withUrl} onClosePanel={vi.fn()} />)

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), {
      key: 'ArrowLeft',
    })

    expect(
      screen.getByRole('tab', { name: 'Notes & requests' }),
    ).toHaveAttribute('aria-selected', 'true')
  })
})
