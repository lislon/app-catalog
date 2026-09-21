import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stubs as the tags test: AppDetails drags the whole panel data layer in
// and none of it decides what Esc does.
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

const app = {
  id: 'tracker',
  slug: 'tracker',
  displayName: 'Tracker',
  appUrl: 'https://tracker.example.com',
  quickJumps: [
    {
      identity: 'case id',
      title: 'Tracker — view case',
      url: '{{baseHost}}/case/{{value}}',
    },
  ],
} as Resource

// The card takes focus on open so Esc closes it. The Quick Jump field takes that
// focus instead — so Esc has to keep working from inside the field, or the
// feature costs the keyboard its way out.
describe('AppDetails — Esc from the quick jump field', () => {
  it('closes the panel', () => {
    const onClosePanel = vi.fn()
    render(<AppDetails app={app} onClosePanel={onClosePanel} />)

    // `code` as well as `key`: the hotkey library matches on the physical code.
    fireEvent.keyDown(screen.getByLabelText('case id'), {
      key: 'Escape',
      code: 'Escape',
    })

    expect(onClosePanel).toHaveBeenCalled()
  })
})
