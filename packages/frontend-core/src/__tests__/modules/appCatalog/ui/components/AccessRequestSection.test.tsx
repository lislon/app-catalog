import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Badges link to a person's page; no router is mounted here.
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}))

const { AccessRequestSection } =
  await import('~/modules/appCatalog/ui/components/AccessRequestSection')

function appWithRoles(roles: unknown): Resource {
  return {
    id: 'alation',
    slug: 'alation',
    displayName: 'Alation',
    accessRequest: {
      approvalMethodSlug: 'service',
      roles,
    },
  } as Resource
}

// `Role.adminNotes` is provisioning-only (directory group names, SSO app, manual
// steps) and is documented as never shown to the requester — but the roles table
// printed it inline to anyone who could reach the page, signed out included.
describe('AccessRequestSection — roles table', () => {
  it('renders the role description and not its adminNotes', () => {
    render(
      <AccessRequestSection
        app={appWithRoles([
          {
            displayName: 'Admin',
            description: 'Full administrative access.',
            adminNotes: 'AD Group: SomeApp_Admin',
          },
        ])}
        approvalMethods={[]}
      />,
    )

    expect(screen.getByText('Full administrative access.')).toBeInTheDocument()
    expect(screen.queryByText(/AD Group: SomeApp_Admin/)).toBeNull()
    expect(screen.queryByText(/^Note:/)).toBeNull()
  })

  it('falls back to an em-dash when a role has no description', () => {
    render(
      <AccessRequestSection
        app={appWithRoles([
          {
            displayName: 'Data Viewer',
            adminNotes: 'LV 1.0 job type (active)',
          },
        ])}
        approvalMethods={[]}
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/LV 1.0 job type/)).toBeNull()
  })
})
