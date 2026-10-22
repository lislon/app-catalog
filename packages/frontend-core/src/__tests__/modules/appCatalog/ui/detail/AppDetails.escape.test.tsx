import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
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
vi.mock('~/modules/appCatalog/ui/detail/useCommunityToolCount', () => ({
  useCommunityToolCount: vi.fn(() => 0),
}))
vi.mock('~/modules/appCatalog/hooks/useUpdateApp', () => ({
  useUpdateApp: vi.fn(() => ({ mutate: vi.fn() })),
}))
vi.mock('~/modules/appCatalog/ui/context/AppCatalogFiltersContext', () => ({
  useAppCatalogFilters: vi.fn(() => ({ selectedTags: [], toggleTag: vi.fn() })),
}))
vi.mock('~/modules/auth', () => ({ useUser: vi.fn(() => null) }))
vi.mock('~/modules/appCatalog/ui/detail/CommunitySection', () => ({
  CommunitySection: () => <div />,
}))
vi.mock('~/modules/appCatalog/ui/detail/usePendingCount', () => ({
  usePendingCount: () => 0,
}))

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')
const { useDismissable } = await import('~/modules/dismiss/DismissStack')

/** Stands in for the card: the layer AppDetails is rendered inside. */
function CardLayer({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismissable(ref, onClose)
  return (
    <div ref={ref} role="dialog" aria-label="card">
      {children}
    </div>
  )
}

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
//
// Escape itself belongs to the card's layer, not to AppDetails. What this pins
// is that the field does not CLAIM it: a field that called preventDefault on
// Escape would keep it from the layer, and the card would stop closing.
describe('AppDetails — Esc from the quick jump field', () => {
  it('reaches the layer the details are rendered in', () => {
    const onClose = vi.fn()
    render(
      <CardLayer onClose={onClose}>
        <AppDetails app={app} />
      </CardLayer>,
    )

    fireEvent.keyDown(screen.getByLabelText('case id'), {
      key: 'Escape',
      code: 'Escape',
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
