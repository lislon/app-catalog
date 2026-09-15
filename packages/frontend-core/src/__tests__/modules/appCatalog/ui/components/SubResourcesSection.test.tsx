import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The component reads `?sub=` and links rows to a child's own page; neither is
// under test here, so stub the router rather than mounting one.
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
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
