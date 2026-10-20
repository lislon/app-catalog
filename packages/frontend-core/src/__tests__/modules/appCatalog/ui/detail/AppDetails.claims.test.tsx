import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

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
vi.mock('~/modules/appCatalog/ui/detail/useOpenFeedbackCount', () => ({
  useOpenFeedbackCount: () => 0,
}))
vi.mock('~/modules/appCatalog/ui/detail/KnowMoreInput', () => ({
  KnowMoreInput: () => null,
}))

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')

const base = {
  id: 'example-app',
  slug: 'example-app',
  displayName: 'Example App',
  description: 'Does things.',
} as Resource

function openBehind(app: Resource) {
  render(<AppDetails app={app} />)
  fireEvent.click(screen.getByRole('tab', { name: /^Behind this card/ }))
}

describe('AppDetails — Claims', () => {
  it('lists active claims under From the community with date and origin', () => {
    openBehind({
      ...base,
      claims: [
        {
          text: 'Lead approves access.',
          addedAt: '2026-10-12',
          origin: 'feedback:abc',
          status: 'active',
        },
        {
          text: 'Old boards are read-only.',
          addedAt: '2026-10-15',
          origin: 'Tools team',
          status: 'active',
        },
      ],
    })

    const heading = screen.getByRole('heading', { name: 'Claims' })
    const community = screen.getByRole('heading', {
      name: 'From the community',
    })
    expect(community.closest('section')).toContainElement(heading)
    expect(screen.getByText('Lead approves access.')).toBeVisible()
    expect(screen.getByText(/from visitor feedback · 2026-10-12/)).toBeVisible()
    expect(screen.getByText(/Tools team · 2026-10-15/)).toBeVisible()
    expect(screen.queryByText(/feedback:abc/)).toBeNull()
  })

  it('lists review claims after active, with In review tag', () => {
    openBehind({
      ...base,
      claims: [
        {
          text: 'Lead approves access.',
          addedAt: '2026-10-12',
          status: 'active',
        },
        {
          text: 'New feature in testing.',
          addedAt: '2026-10-15',
          origin: 'from visitor feedback',
          status: 'review',
        },
      ],
    })

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Lead approves access.')
    expect(items[0]).not.toHaveTextContent('In review')
    expect(items[1]).toHaveTextContent('New feature in testing.')
    expect(items[1]).toHaveTextContent('In review')
    expect(screen.getByText(/from visitor feedback · 2026-10-15/)).toBeVisible()
  })

  it('shows Claims section when only review claims exist', () => {
    openBehind({
      ...base,
      claims: [
        {
          text: 'Unverified claim.',
          addedAt: '2026-10-16',
          status: 'review',
        },
      ],
    })

    expect(screen.getByRole('heading', { name: 'Claims' })).toBeVisible()
    expect(screen.getByText('Unverified claim.')).toBeVisible()
    expect(screen.getByText('In review')).toBeVisible()
  })

  it('folds archived claims away, with their reason', () => {
    openBehind({
      ...base,
      claims: [
        {
          text: 'No mobile app.',
          addedAt: '2026-08-03',
          status: 'archived',
          archiveReason: 'superseded by https://example.com/guide',
          archivedAt: '2026-10-02',
        },
      ],
    })

    const summary = screen.getByText('Archived (1)')
    expect(screen.getByText('No mobile app.')).not.toBeVisible()
    fireEvent.click(summary)
    expect(screen.getByText('No mobile app.')).toBeVisible()
    expect(
      screen.getByText(
        /Archived 2026-10-02 — superseded by https:\/\/example.com\/guide/,
      ),
    ).toBeVisible()
  })

  it('renders an archived claim without a reason instead of crashing', () => {
    openBehind({
      ...base,
      claims: [
        { text: 'Legacy claim.', addedAt: '2026-01-01', status: 'archived' },
      ],
    })
    fireEvent.click(screen.getByText('Archived (1)'))
    expect(screen.getByText('Legacy claim.')).toBeVisible()
    expect(screen.queryByText(/undefined/)).toBeNull()
  })

  // Asserted on the open Behind this card tab, so the absence means something.
  it('has no Claims section when there are none', () => {
    openBehind({ ...base, claims: [] })
    expect(
      screen.getByRole('heading', { name: 'From the community' }),
    ).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Claims' })).toBeNull()
  })

  it('renders multiple claims with the same text without key warnings', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')
    openBehind({
      ...base,
      claims: [
        { text: 'Single sign-on.', addedAt: '2026-10-01', status: 'active' },
        { text: 'Single sign-on.', addedAt: '2026-10-05', status: 'active' },
      ],
    })

    const items = screen.getAllByText('Single sign-on.')
    expect(items).toHaveLength(2)
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/same key/),
    )
    consoleErrorSpy.mockRestore()
  })
})
