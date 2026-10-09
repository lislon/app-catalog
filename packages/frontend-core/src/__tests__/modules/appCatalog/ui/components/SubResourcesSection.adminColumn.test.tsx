import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Resource } from '@igstack/app-catalog-backend-core'
import { ExtensionsContext } from '~/modules/extensions'
import type { AcPlugin } from '~/modules/extensions'
import { SubResourcesSection } from '~/modules/appCatalog/ui/components/SubResourcesSection'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('~/modules/appCatalog/ui/components/PersonBadge', () => ({
  PersonBadge: () => null,
  PersonOrGroupBadge: () => null,
}))

const parent = { slug: 'cloud', displayName: 'Cloud' } as Resource
const children = [
  { slug: 'acct-a', displayName: 'account-a' },
  { slug: 'acct-b', displayName: 'account-b' },
] as Resource[]

function mount(plugins?: AcPlugin[]) {
  return render(
    <ExtensionsContext value={plugins}>
      <SubResourcesSection
        subResources={children}
        parentSlug={parent.slug}
        parent={parent}
      />
    </ExtensionsContext>,
  )
}

const rowActionsPlugin: AcPlugin = {
  name: 'admin-actions',
  slots: {
    resourceSubResourceRowActions: ({ resource }) => (
      <button type="button">Provision {resource.displayName}</button>
    ),
  },
}

/**
 * The column is layout, so unlike an ordinary slot it cannot be "rendered empty"
 * — a header with no cells under it reads as a broken table, and the
 * open-source build registers no plugins at all. These two tests are the parity
 * invariant: nothing registered has to look exactly like no slot existing.
 */
describe('the sub-resources Admin column', () => {
  it('is absent entirely when no plugin fills the row slot', () => {
    mount(undefined)

    expect(
      screen.queryByRole('columnheader', { name: 'Admin' }),
    ).not.toBeInTheDocument()
    // Five columns, the same as before the slot existed.
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
  })

  it('appears, with one cell per row, once a plugin fills it', () => {
    mount([rowActionsPlugin])

    expect(
      screen.getByRole('columnheader', { name: 'Admin' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(6)

    // Called once PER ROW and handed that row — the opposite shape to the
    // header slot, which is called once with the whole list.
    expect(
      screen.getByRole('button', { name: 'Provision account-a' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Provision account-b' }),
    ).toBeInTheDocument()
  })

  it('keeps the empty-state row spanning the full width', async () => {
    // A colSpan that does not match the column count leaves a stray cell and a
    // visibly broken border, and it only shows up when a filter matches nothing.
    //
    // Typed, not seeded via `initialSearch`: that prop is deliberately ignored
    // unless it matches a child, so passing a non-matching term there shows
    // every row and the empty state never appears.
    const { container } = mount([rowActionsPlugin])
    await userEvent.type(
      screen.getByPlaceholderText(/Search resources/i),
      'nothing-matches-this',
    )

    const empty = within(container).getByText(/No resources match your filters/)
    expect(empty).toHaveAttribute('colspan', '6')
  })

  it('skips the column when the parent is not known', () => {
    // The slot's payload promises a parent. Without one there is nothing to
    // decide against, so the column is left out rather than passed a hole.
    render(
      <ExtensionsContext value={[rowActionsPlugin]}>
        <SubResourcesSection subResources={children} parentSlug={parent.slug} />
      </ExtensionsContext>,
    )

    expect(
      screen.queryByRole('columnheader', { name: 'Admin' }),
    ).not.toBeInTheDocument()
  })
})
