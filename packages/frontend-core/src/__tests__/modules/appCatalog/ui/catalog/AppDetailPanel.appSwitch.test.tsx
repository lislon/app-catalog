import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The panel drags the whole detail data layer in; none of it decides whether
// per-app state resets, so the hooks and the fetching children are stubbed --
// but AppDetails itself is REAL, because the chain under test is
// AppDetailPanel -> AppDetails -> AccessRequestSection -> the roles table.
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

const { AppDetailPanel } =
  await import('~/modules/appCatalog/ui/catalog/AppDetailPanel')

function appWithRoles(slug: string, count: number): Resource {
  return {
    id: slug,
    slug,
    displayName: slug,
    description: `${slug} description.`,
    accessRequest: {
      approvalMethodSlug: 'service',
      roles: Array.from({ length: count }, (_, i) => ({
        displayName: `${slug} role ${i + 1}`,
      })),
    },
  }
}

function roleRowCount() {
  return screen
    .getByRole('table')
    .querySelector('tbody')
    ?.querySelectorAll('tr').length
}

// Two flows reach a different app without closing the card: "View replacement"
// on a deprecated entry, and an access prerequisite's parent. Both swap the
// `app` prop, and nothing in the chain down to the roles table was keyed by it,
// so the table arrived at the new app still expanded -- pushing that app's
// approvers and post-approval steps below the fold, which is exactly what
// truncating at five rows exists to prevent.
describe('AppDetailPanel — navigating from one app to another', () => {
  it("collapses the new app's roles table", () => {
    const { rerender } = render(
      <AppDetailPanel app={appWithRoles('labvantage', 8)} onClose={vi.fn()} />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Show all \(8\) roles/ }),
    )
    expect(
      screen.getByRole('button', { name: 'Show fewer roles' }),
    ).toBeInTheDocument()

    rerender(
      <AppDetailPanel app={appWithRoles('alation', 7)} onClose={vi.fn()} />,
    )

    const toggle = screen.getByRole('button', { name: /Show all \(7\) roles/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // 5 roles + the expand row.
    expect(roleRowCount()).toBe(6)
  })

  // The other half of the fix: a key that changes on anything but the resource
  // would throw the reader's own expansion away mid-read. Re-rendering the same
  // app must leave the table exactly as they left it.
  it('keeps the expansion when the same app re-renders', () => {
    const app = appWithRoles('labvantage', 8)
    const { rerender } = render(<AppDetailPanel app={app} onClose={vi.fn()} />)

    fireEvent.click(
      screen.getByRole('button', { name: /Show all \(8\) roles/ }),
    )
    rerender(<AppDetailPanel app={app} onClose={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Show fewer roles' }),
    ).toHaveAttribute('aria-expanded', 'true')
    // 8 roles + the collapse row.
    expect(roleRowCount()).toBe(9)
  })
})
