import type { Resource } from '@igstack/app-catalog-backend-core'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import type { AcPlugin } from '~/modules/extensions'
import { ExtensionsContext } from '~/modules/extensions'

const search: Record<string, unknown> = {}
const feedback = vi.hoisted(() => ({
  items: [] as unknown[],
  error: null as Error | null,
  hasData: true,
}))

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => search),
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    state: { location: { pathname: '/app/thing', search } },
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
  useAppCatalogFilters: vi.fn(() => ({
    state: { searchValue: '' },
    actions: {},
  })),
}))
vi.mock('~/modules/auth', () => ({ useUser: vi.fn(() => null) }))
// CommunitySection and the count are real: the Share button's whole job is to
// focus the input, and the count has to agree with the feed's Pending badges.
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: feedback.hasData
      ? { items: feedback.items, openCount: 0 }
      : undefined,
    error: feedback.error,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))
vi.mock('~/api/infra/trpc', () => ({
  useTRPC: vi.fn(() => ({
    feedback: {
      add: { mutationOptions: (o: unknown) => o },
      edit: { mutationOptions: (o: unknown) => o },
      dismiss: { mutationOptions: (o: unknown) => o },
      list: {
        queryOptions: () => ({ queryKey: ['feedback', 'list'] }),
        queryKey: () => ['feedback', 'list'],
      },
    },
  })),
}))

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')

const app = {
  id: 'thing',
  slug: 'thing',
  displayName: 'Thing',
  description: 'Does a thing.',
  links: [{ title: 'User guide', url: 'https://docs.example.com/guide' }],
  background: 'Built to replace the spreadsheet.',
  sources: ['https://wiki.example.com/thing'],
  createdAt: '2026-01-01T00:00:00.000Z',
  aiPrompt: 'Keep the scope explicit.',
  aiMemory: 'Maps to the legacy portal.',
  freshness: {
    lastCheckedAt: '2026-10-19T00:00:00.000Z',
    lastContentChangeAt: null,
    isStale: false,
  },
} as Resource

const tabNames = () =>
  screen.getAllByRole('tab').map((tab) => tab.textContent.trim())

const behindTab = () => screen.getByRole('tab', { name: /^Behind this card/ })
const input = () =>
  screen.getByRole('textbox', { name: 'Know more about Thing?' })

beforeEach(() => {
  feedback.items = []
  feedback.error = null
  feedback.hasData = true
  for (const key of Object.keys(search)) delete search[key]
})

describe('the tab strip', () => {
  it('is Overview, Access, Documentation, Behind this card', () => {
    render(<AppDetails app={app} />)
    expect(tabNames()).toEqual([
      'Overview',
      expect.stringMatching(/^Access/),
      'Documentation',
      'Behind this card',
    ])
  })

  it('drops Documentation when the entry has neither links nor background', () => {
    render(<AppDetails app={{ ...app, links: [], background: undefined }} />)
    expect(screen.queryByRole('tab', { name: 'Documentation' })).toBeNull()
    expect(behindTab()).toBeInTheDocument()
  })

  it('sends ?tab=documentation to Behind this card when the entry has no Documentation', () => {
    search.tab = 'documentation'
    render(<AppDetails app={{ ...app, links: [], background: undefined }} />)
    expect(behindTab()).toHaveAttribute('aria-selected', 'true')
  })

  it('sends an old ?tab=notes link to Behind this card', () => {
    search.tab = 'notes'
    render(<AppDetails app={app} />)
    expect(behindTab()).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Documentation', () => {
  it('holds the links and Background, and no provenance', () => {
    search.tab = 'documentation'
    render(<AppDetails app={app} />)
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('User guide')).toBeVisible()
    expect(
      within(panel).getByRole('heading', { name: 'Background' }),
    ).toBeVisible()
    expect(within(panel).queryByRole('heading', { name: /Sources/ })).toBeNull()
    expect(within(panel).queryByText(/Keep the scope explicit/)).toBeNull()
  })
})

describe('Behind this card', () => {
  it('holds the three groups in order', () => {
    search.tab = 'behind'
    render(<AppDetails app={app} />)
    const panel = screen.getByRole('tabpanel')
    const groups = within(panel)
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    expect(groups).toEqual([
      'Comments',
      'Kept up to date from',
      'How the AI maintains this card',
    ])
    expect(within(panel).getByText('Keep the scope explicit.')).toBeVisible()
    expect(within(panel).getByText('Maps to the legacy portal.')).toBeVisible()
    expect(within(panel).getByText(/wiki\.example\.com\/thing/)).toBeVisible()
    expect(
      within(panel).getByText(/^Last checked .+ · added .+$/),
    ).toBeVisible()
  })

  it('has no AI group when the entry has neither prompt nor memory', () => {
    search.tab = 'behind'
    render(
      <AppDetails app={{ ...app, aiPrompt: undefined, aiMemory: undefined }} />,
    )
    expect(
      screen.queryByRole('heading', { name: 'How the AI maintains this card' }),
    ).toBeNull()
  })

  it('puts the input above the Comments heading and the feed', () => {
    search.tab = 'behind'
    render(
      <AppDetails
        app={{
          ...app,
          claims: [
            { text: 'Lead approves.', addedAt: '2026-10-01', status: 'active' },
          ],
        }}
      />,
    )
    const field = input()
    const heading = screen.getByRole('heading', { name: 'Comments' })
    const fact = screen.getByText('Lead approves.')
    expect(fact).toBeVisible()
    expect(
      field.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      heading.compareDocumentPosition(fact) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('has no input on the other tabs', () => {
    render(<AppDetails app={app} />)
    for (const name of ['Overview', /^Access/, 'Documentation']) {
      fireEvent.click(screen.getByRole('tab', { name }))
      expect(screen.queryByRole('textbox', { name: /Know more/ })).toBeNull()
    }
  })
})

describe('Share what you know', () => {
  it('opens Behind this card with the input focused and highlighted, every time', () => {
    vi.useFakeTimers()
    try {
      render(<AppDetails app={app} />)
      const share = screen.getByRole('button', { name: 'Share what you know' })

      fireEvent.click(share)
      expect(behindTab()).toHaveAttribute('aria-selected', 'true')
      expect(input()).toHaveFocus()
      expect(input().closest('form')).toHaveClass('is-flash')

      act(() => vi.advanceTimersByTime(1000))
      expect(input().closest('form')).not.toHaveClass('is-flash')

      // Again, from another tab.
      fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
      fireEvent.click(share)
      expect(behindTab()).toHaveAttribute('aria-selected', 'true')
      expect(input()).toHaveFocus()

      // And again while already there: re-focuses and re-highlights.
      act(() => vi.advanceTimersByTime(1000))
      input().blur()
      fireEvent.click(share)
      expect(input()).toHaveFocus()
      expect(input().closest('form')).toHaveClass('is-flash')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not steal focus when the reader opens the tab themselves', () => {
    render(<AppDetails app={app} />)
    fireEvent.click(screen.getByRole('button', { name: 'Share what you know' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    fireEvent.click(behindTab())
    expect(input()).not.toHaveFocus()
  })

  it('keeps accessible name "Share what you know" in compact variant', () => {
    render(<AppDetails app={app} />)
    const share = screen.getByRole('button', { name: 'Share what you know' })
    expect(share).toBeInTheDocument()
  })

  it('scrolls the active tab into view when selecting via Share', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    render(<AppDetails app={app} />)
    fireEvent.click(screen.getByRole('button', { name: 'Share what you know' }))
    // scrollIntoView is called in a requestAnimationFrame callback.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  })
})

const pendingNote = {
  id: 'n1',
  authorName: 'Merry Mole',
  body: 'Leads approve.',
  subject: null,
  resourceSlug: 'thing',
  resourceName: 'Thing',
  attachmentIds: [],
  createdAt: '2026-10-10T10:00:00.000Z',
  reviewedAt: null,
  editedAt: null,
  isMine: false,
  isSystem: false,
  canEditUntil: null,
  status: null,
  reviewerReply: null,
}

describe('the Behind this card count', () => {
  it('is the number of Pending badges in the feed', () => {
    search.tab = 'behind'
    feedback.items = [
      pendingNote,
      { ...pendingNote, id: 'n2', status: 'acknowledged' },
    ]
    render(
      <AppDetails
        app={{
          ...app,
          claims: [
            // The open note's own claim: one entry, one Pending.
            {
              text: 'A.',
              addedAt: '2026-10-11',
              origin: 'feedback:n1',
              status: 'review',
            },
            { text: 'B.', addedAt: '2026-10-01', status: 'review' },
            { text: 'C.', addedAt: '2026-10-01', status: 'active' },
          ],
        }}
      />,
    )
    expect(screen.getAllByText('Pending')).toHaveLength(2)
    expect(behindTab()).toHaveTextContent(/^Behind this card2$/)
  })

  it('is hidden at zero', () => {
    render(<AppDetails app={app} />)
    expect(behindTab().textContent).toBe('Behind this card')
  })

  it('does not show standalone claims before the list arrives', () => {
    search.tab = 'behind'
    feedback.hasData = false
    render(
      <AppDetails
        app={{
          ...app,
          claims: [
            {
              text: 'Early claim.',
              addedAt: '2026-10-01',
              origin: 'feedback:gone',
              status: 'review',
            },
          ],
        }}
      />,
    )
    expect(screen.queryByText('Early claim.')).toBeNull()
    expect(behindTab().textContent).toBe('Behind this card')
  })

  it('on list error, the badge count equals Pending entries from claims only', () => {
    search.tab = 'behind'
    feedback.hasData = false
    feedback.error = new Error('Network')
    render(
      <AppDetails
        app={{
          ...app,
          claims: [
            { text: 'A.', addedAt: '2026-10-01', status: 'review' },
            { text: 'B.', addedAt: '2026-10-02', status: 'active' },
          ],
        }}
      />,
    )
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('A.')).toBeVisible()
    expect(within(panel).getByText('B.')).toBeVisible()
    expect(within(panel).getAllByText('Pending')).toHaveLength(1)
    expect(within(panel).getAllByText('Used as source')).toHaveLength(1)
    expect(behindTab()).toHaveTextContent(/^Behind this card1$/)
  })
})

describe('the card-source slot', () => {
  it("renders a plugin's content on Behind this card", () => {
    search.tab = 'behind'
    let received: unknown = null
    const plugin: AcPlugin = {
      name: 'card-source',
      slots: {
        resourceDetailCardSource: (props) => {
          received = props
          return <a href="https://example.com/src">View this card's source</a>
        },
      },
    }
    render(
      <ExtensionsContext value={[plugin]}>
        <AppDetails app={app} />
      </ExtensionsContext>,
    )
    expect(
      within(screen.getByRole('tabpanel')).getByRole('link', {
        name: "View this card's source",
      }),
    ).toBeVisible()
    expect(received).toEqual({ appSlug: 'thing', appName: 'Thing' })
  })

  it('renders nothing by default', () => {
    search.tab = 'behind'
    render(<AppDetails app={app} />)
    expect(screen.queryByRole('link', { name: /source/i })).toBeNull()
  })
})
