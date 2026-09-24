import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The component reads `?sub=` and links rows to a child's own page; neither is
// under test here, so stub the router rather than mounting one.
const routerSearch: { sub?: string } = {}
const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => routerSearch),
  useNavigate: vi.fn(() => navigate),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}))

const { SubResourcesSection } =
  await import('~/modules/appCatalog/ui/components/SubResourcesSection')

function sub(slug: string, extra: unknown, appUrl?: string): Resource {
  return {
    id: slug,
    slug,
    displayName: slug,
    parentSlug: 'cloud-console',
    appUrl,
    extra: extra as Resource['extra'],
  } as Resource
}

// A cloud account row shows its account id; when the entry also carries its own
// per-account console URL that id must be the link to it — an account-agnostic
// parent URL is what made the ids un-launchable.
describe('SubResourcesSection — account id as deep link', () => {
  it('links the account id to the sub-resource own appUrl', () => {
    render(
      <SubResourcesSection
        parentSlug="cloud-console"
        subResources={[
          sub(
            'acct-a',
            { awsAccountId: '111122223333' },
            'https://portal.example/#/console?account_id=111122223333&role_name=ReadOnly',
          ),
        ]}
      />,
    )
    const link = screen.getByRole('link', { name: '111122223333' })
    expect(link).toHaveAttribute(
      'href',
      'https://portal.example/#/console?account_id=111122223333&role_name=ReadOnly',
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('leaves the account id as plain text when there is no appUrl', () => {
    render(
      <SubResourcesSection
        parentSlug="cloud-console"
        subResources={[sub('acct-b', { awsAccountId: '444455556666' })]}
      />,
    )
    expect(screen.getByText('444455556666')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: '444455556666' }),
    ).not.toBeInTheDocument()
  })

  it('gives each row its own target', () => {
    render(
      <SubResourcesSection
        parentSlug="cloud-console"
        subResources={[
          sub(
            'acct-a',
            { awsAccountId: '111122223333' },
            'https://portal.example/a',
          ),
          sub(
            'acct-b',
            { awsAccountId: '444455556666' },
            'https://portal.example/b',
          ),
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: '111122223333' })).toHaveAttribute(
      'href',
      'https://portal.example/a',
    )
    expect(screen.getByRole('link', { name: '444455556666' })).toHaveAttribute(
      'href',
      'https://portal.example/b',
    )
  })
})

// A `?sub=` deep link singles out one row; the table must say so and offer a
// way back to the full list without editing the URL.
describe('SubResourcesSection — clearing the ?sub= selection', () => {
  const rows = [sub('a', {}), sub('b', {}), sub('c', {})]

  it('shows the selection as a dismissible filter that restores every row', () => {
    routerSearch.sub = 'b'
    navigate.mockClear()
    const { rerender } = render(
      <SubResourcesSection parentSlug="p" subResources={rows} />,
    )
    expect(screen.getByText('Sub-Resources (1 of 3)')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Clear sub-resource filter' }),
    )
    const { search } = navigate.mock.calls[0]![0] as {
      search: (prev: object) => object
    }
    expect(search({ sub: 'b', q: 'x' })).toEqual({ sub: undefined, q: 'x' })

    // The router drops `sub` from the URL, which re-renders the section.
    routerSearch.sub = undefined
    rerender(<SubResourcesSection parentSlug="p" subResources={rows} />)
    expect(screen.getByText('Sub-Resources (3 of 3)')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Search resources by name or alias...'),
    ).toHaveFocus()
    // The user keeps their place: the row they came for is still marked.
    expect(
      screen.getByText('b', { selector: 'a' }).closest('tr'),
    ).toHaveAttribute('aria-current', 'true')
  })

  it('shows no clear control without a selection', () => {
    routerSearch.sub = undefined
    render(<SubResourcesSection parentSlug="p" subResources={rows} />)
    expect(
      screen.queryByRole('button', { name: 'Clear sub-resource filter' }),
    ).not.toBeInTheDocument()
  })
})
