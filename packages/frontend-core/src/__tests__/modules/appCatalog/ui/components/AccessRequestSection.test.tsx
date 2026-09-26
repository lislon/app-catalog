import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { UiSettingsContext } from '~/context/UiSettingsContext'
import { AppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import type { AppCatalogContextIface } from '~/modules/appCatalog/context/AppCatalogContext'

// Badges link to a person's page; no router is mounted here.
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  useRouterState: vi.fn(() => '/'),
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

  // A long role list (one real entry has 47) pushed the approval steps below
  // the fold; show the first few and let the reader expand the rest.
  it('collapses a long role list behind a "Show all" toggle', () => {
    const roles = Array.from({ length: 8 }, (_, i) => ({
      displayName: `Role ${i + 1}`,
    }))
    render(
      <AccessRequestSection app={appWithRoles(roles)} approvalMethods={[]} />,
    )

    expect(screen.getByText('Role 5')).toBeInTheDocument()
    expect(screen.queryByText('Role 6')).toBeNull()
    const toggle = screen.getByRole('button', { name: 'Show all 8 roles' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(screen.getByText('Role 8')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show fewer roles' }),
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows five or fewer roles without a toggle', () => {
    const roles = Array.from({ length: 5 }, (_, i) => ({
      displayName: `Role ${i + 1}`,
    }))
    render(
      <AccessRequestSection app={appWithRoles(roles)} approvalMethods={[]} />,
    )

    expect(screen.getByText('Role 5')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull()
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

// Documentation links describe the whole access process, not the request
// step, so in a two-step entry they sat visually inside Step 1 and read as
// "docs for requesting" — a reader looking for the CLI guide after approval
// never scrolled back up to find it.
describe('AccessRequestSection — documentation placement', () => {
  it('renders Documentation after Step 2, not inside Step 1', () => {
    render(
      <AccessRequestSection
        app={{
          id: 'cloud',
          slug: 'cloud',
          displayName: 'Cloud',
          accessRequest: {
            approvalMethodSlug: 'service',
            comments: 'Request it from the help desk.',
            postApprovalInstructions: 'Ask the account maintainers.',
            urls: [{ label: 'CLI guide', url: 'https://docs.example.com/cli' }],
          },
        }}
        approvalMethods={[]}
      />,
    )

    const step2 = screen.getByText('Step 2')
    const docs = screen.getByRole('heading', { name: 'Documentation' })
    expect(
      step2.compareDocumentPosition(docs) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: /CLI guide/ })).toHaveAttribute(
      'href',
      'https://docs.example.com/cli',
    )
  })
})

// The channel mentions live in the access-request text fields, which this
// section renders itself — so they must go through the same markdown path as
// the description or the links never appear where the data actually is.
describe('AccessRequestSection — chat channel mentions', () => {
  it('links a #channel mention inside comments and post-approval steps', () => {
    const ctx = {
      resources: [],
      isLoadingApps: false,
      tagsDefinitions: [],
      approvalMethods: [],
      persons: [],
      groups: [],
    } satisfies AppCatalogContextIface

    render(
      <UiSettingsContext
        value={{ chatChannelUrlTemplate: 'https://chat.example.com/c/{name}' }}
      >
        <AppCatalogContext value={ctx}>
          <AccessRequestSection
            app={{
              id: 'swaggerhub',
              slug: 'swaggerhub',
              displayName: 'SwaggerHub',
              accessRequest: {
                approvalMethodSlug: 'service',
                comments: 'For questions, ask in Slack #swaggerhub channel.',
                postApprovalInstructions: 'Then say hi in #onboarding.',
              },
            }}
            approvalMethods={[]}
          />
        </AppCatalogContext>
      </UiSettingsContext>,
    )

    expect(screen.getByRole('link', { name: '#swaggerhub' })).toHaveAttribute(
      'href',
      'https://chat.example.com/c/swaggerhub',
    )
    expect(screen.getByRole('link', { name: '#onboarding' })).toHaveAttribute(
      'href',
      'https://chat.example.com/c/onboarding',
    )
  })
})
