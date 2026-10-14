import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stubs as the tags test: AppDetails drags the whole panel data layer in
// and none of it decides what Enter does.
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

/** Enter as the browser delivers it to whatever holds focus. */
function pressEnter(target: Element) {
  fireEvent.keyDown(target, { key: 'Enter', code: 'Enter' })
  fireEvent.keyUp(target, { key: 'Enter', code: 'Enter' })
}

/** The card as it opens from search: the dialog itself holds focus. */
function openCard(app: Resource) {
  render(
    <div role="dialog" aria-label="card" tabIndex={-1}>
      <AppDetails app={app} />
    </div>,
  )
  const card = screen.getByRole('dialog', { name: 'card' })
  card.focus()
  return card
}

// Enter on a search result opens the card; a second Enter has to take the
// reader into the app, or the keyboard path ends one step short of the goal.
describe('AppDetails — Enter on the open card', () => {
  it('opens the app address in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const card = openCard({
      id: 'tracker',
      slug: 'tracker',
      displayName: 'Tracker',
      appUrl: 'https://tracker.example.com',
    })

    pressEnter(card)

    expect(open).toHaveBeenCalledWith(
      'https://tracker.example.com',
      '_blank',
      'noopener,noreferrer',
    )
    open.mockRestore()
  })

  it('opens nothing for an app with no address', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const card = openCard({
      id: 'tracker',
      slug: 'tracker',
      displayName: 'Tracker',
    })

    pressEnter(card)

    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })
})
