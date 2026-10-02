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

  // A long role list (one real entry has 54) pushed the approval steps below
  // the fold; show the first few and let the reader expand the rest.
  //
  // The control has to live in the table's LAST BODY ROW, not under the table:
  // a table whose border closes under its last visible row reads as the
  // complete list, and the standalone link below it went unnoticed.
  it('ends a truncated table with the expand row, inside the table body', () => {
    const roles = Array.from({ length: 8 }, (_, i) => ({
      displayName: `Role ${i + 1}`,
    }))
    render(
      <AccessRequestSection app={appWithRoles(roles)} approvalMethods={[]} />,
    )

    expect(screen.getByText('Role 5')).toBeInTheDocument()
    expect(screen.queryByText('Role 6')).toBeNull()

    const toggle = screen.getByRole('button', { name: /Show all \(8\) roles/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    const row = toggle.closest('tr')
    const body = row?.parentElement
    expect(body?.tagName).toBe('TBODY')
    expect(row).toBe(body?.lastElementChild)
    // 5 visible roles + the control row: the table visibly continues past the
    // last data row.
    expect(body?.querySelectorAll('tr')).toHaveLength(6)
    // The whole point of the row is that it spans the table. Without the
    // colSpan the control shrinks into the first column and the row goes
    // ragged, while every assertion above still passes.
    expect(row?.querySelector('td')).toHaveAttribute('colspan', '2')
  })

  it('keeps the control in the same place when expanded, so the layout does not jump', () => {
    const roles = Array.from({ length: 8 }, (_, i) => ({
      displayName: `Role ${i + 1}`,
    }))
    render(
      <AccessRequestSection app={appWithRoles(roles)} approvalMethods={[]} />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Show all \(8\) roles/ }),
    )

    expect(screen.getByText('Role 8')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Show fewer roles' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const row = toggle.closest('tr')
    const body = row?.parentElement
    expect(body?.tagName).toBe('TBODY')
    expect(row).toBe(body?.lastElementChild)
    expect(body?.querySelectorAll('tr')).toHaveLength(9)
  })

  it('shows five or fewer roles without a toggle, and with no extra row', () => {
    const roles = Array.from({ length: 5 }, (_, i) => ({
      displayName: `Role ${i + 1}`,
    }))
    render(
      <AccessRequestSection app={appWithRoles(roles)} approvalMethods={[]} />,
    )

    const lastRole = screen.getByText('Role 5')
    expect(lastRole).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull()
    expect(lastRole.closest('tbody')?.querySelectorAll('tr')).toHaveLength(5)
  })

  // Keyboard activation is inherited, not implemented: a native <button> gets
  // focus, Enter and Space from the platform. jsdom does not turn Enter into a
  // click, so asserting that here would only re-test fireEvent -- assert the
  // element type the behaviour follows from instead. A <tr role="button"> would
  // need its own key handling and would not satisfy this.
  it('uses a focusable native button, so Enter and Space work without handlers', () => {
    const roles = Array.from({ length: 8 }, (_, i) => ({
      displayName: `Role ${i + 1}`,
    }))
    render(
      <AccessRequestSection app={appWithRoles(roles)} approvalMethods={[]} />,
    )

    const toggle = screen.getByRole('button', { name: /Show all \(8\) roles/ })
    expect(toggle.tagName).toBe('BUTTON')
    toggle.focus()
    expect(toggle).toHaveFocus()
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

const CUSTOM_METHOD = {
  slug: 'custom',
  displayName: 'Custom',
  type: 'custom',
  config: {},
} as const

// The section used to `return null` whenever an entry had no access fields at
// all, so its card showed no "How to get access" box whatsoever — the reader
// was told nothing rather than told we do not know yet (#181). That is the one
// hole left in the rule #31 established for `custom`: never render nothing,
// always surface a line.
//
// The line itself must not over-promise. "Contact the owner below" is only true
// when a contact is actually rendered — the Approvers block in this box, or the
// owner block further down the detail page — and both are conditional.
describe('AccessRequestSection — entries with no access information', () => {
  const bare: Resource = {
    id: 'ghost',
    slug: 'ghost',
    displayName: 'Ghost',
  }

  it('still renders the box, instead of nothing, when every access field is empty', () => {
    render(<AccessRequestSection app={bare} approvalMethods={[]} />)

    expect(
      screen.getByRole('heading', { name: 'How to get access' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/not documented yet/)).toBeInTheDocument()
  })

  // Nothing is listed anywhere for such an entry, so pointing at "the owner
  // below" sends the reader to a block that is never rendered.
  it('does not promise a contact when the entry has none', () => {
    render(<AccessRequestSection app={bare} approvalMethods={[]} />)

    expect(screen.getByText(/no owner is listed/)).toBeInTheDocument()
    expect(screen.queryByText(/contact the owner below/)).toBeNull()
  })

  // Same absent-contact problem on the pre-existing `custom` path: a bare
  // `custom` method with no approvers and no owner already promised a contact.
  it('does not promise a contact for a bare custom method with no approvers or owner', () => {
    render(
      <AccessRequestSection
        app={{
          id: 'lonely',
          slug: 'lonely',
          displayName: 'Lonely',
          accessRequest: { approvalMethodSlug: 'custom' },
        }}
        approvalMethods={[CUSTOM_METHOD]}
      />,
    )

    expect(screen.getByText(/no owner is listed/)).toBeInTheDocument()
    expect(screen.queryByText(/contact the owner below/)).toBeNull()
  })

  // The regression guard for the two tests above: when a contact IS rendered,
  // the original wording has to survive, or the fix has just deleted it.
  // Rendering an approver badge needs the catalog context to resolve the slug.
  it('keeps pointing at the owner when an approver is listed', () => {
    const ctx = {
      resources: [],
      isLoadingApps: false,
      tagsDefinitions: [],
      approvalMethods: [],
      persons: [],
      groups: [],
    } satisfies AppCatalogContextIface

    render(
      <AppCatalogContext value={ctx}>
        <AccessRequestSection
          app={{
            id: 'staffed',
            slug: 'staffed',
            displayName: 'Staffed',
            accessRequest: {
              approvalMethodSlug: 'custom',
              approverSlugs: ['someone@example.com'],
            },
          }}
          approvalMethods={[CUSTOM_METHOD]}
        />
      </AppCatalogContext>,
    )

    expect(screen.getByText(/contact the owner below/)).toBeInTheDocument()
    expect(screen.queryByText(/no owner is listed/)).toBeNull()
  })

  // An owner rendered by the detail page below this section also counts as a
  // reachable contact, even though this component does not draw it itself.
  it('keeps pointing at the owner when only ownerPersonSlug is set', () => {
    render(
      <AccessRequestSection
        app={{
          id: 'owned',
          slug: 'owned',
          displayName: 'Owned',
          accessRequest: { approvalMethodSlug: 'custom' },
          ownerPersonSlug: 'someone@example.com',
        }}
        approvalMethods={[CUSTOM_METHOD]}
      />,
    )

    expect(screen.getByText(/contact the owner below/)).toBeInTheDocument()
  })

  // An empty entry has no steps, no roles and no approvers, so the box must not
  // grow the scaffolding that belongs to a documented one.
  it('shows no step badges, roles table or approvers for an empty entry', () => {
    render(<AccessRequestSection app={bare} approvalMethods={[]} />)

    expect(screen.queryByText('Step 1')).toBeNull()
    expect(screen.queryByText('Step 2')).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Available Roles' }),
    ).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Approvers' })).toBeNull()
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
