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

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')

const base = {
  id: 'example-app',
  slug: 'example-app',
  displayName: 'Example App',
  description: 'Does things.',
} as Resource

function openDocs(app: Resource) {
  render(<AppDetails app={app} />)
  fireEvent.click(screen.getByRole('tab', { name: /documentation/i }))
}

describe('AppDetails — Claims', () => {
  it('lists active claims under Sources with date and origin', () => {
    openDocs({
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
    const sources = screen.getByRole('heading', { name: 'Sources' })
    // Under Sources, not above it.
    expect(
      sources.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByText('Lead approves access.')).toBeVisible()
    expect(screen.getByText(/2026-10-12 · from visitor feedback/)).toBeVisible()
    expect(screen.getByText(/2026-10-15 · Tools team/)).toBeVisible()
    expect(screen.queryByText(/feedback:abc/)).toBeNull()
  })

  it('folds archived claims away, with their reason', () => {
    openDocs({
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
    openDocs({
      ...base,
      claims: [
        { text: 'Legacy claim.', addedAt: '2026-01-01', status: 'archived' },
      ],
    })
    fireEvent.click(screen.getByText('Archived (1)'))
    expect(screen.getByText('Legacy claim.')).toBeVisible()
    expect(screen.queryByText(/undefined/)).toBeNull()
  })

  // Asserted on the open Documentation tab, so the absence means something.
  it('has no Claims section when there are none', () => {
    openDocs({ ...base, claims: [] })
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Claims' })).toBeNull()
  })

  it('renders multiple claims with the same text without key warnings', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')
    openDocs({
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
