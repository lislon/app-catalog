import type { Claim } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Only the list query matters here; mutations are inert.
const state = vi.hoisted(() => ({
  items: [] as unknown[],
  calls: [] as [string, unknown][],
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { items: state.items, openCount: 0 },
    isLoading: false,
    isPending: false,
  })),
  useMutation: vi.fn((options?: { name?: string }) => ({
    mutate: (vars: unknown) => state.calls.push([options?.name ?? '', vars]),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))
vi.mock('~/api/infra/trpc', () => ({
  useTRPC: vi.fn(() => ({
    feedback: {
      list: {
        queryOptions: () => ({ queryKey: ['feedback'] }),
        queryKey: () => ['feedback'],
      },
      add: { mutationOptions: (o: object) => ({ ...o, name: 'add' }) },
      edit: { mutationOptions: (o: object) => ({ ...o, name: 'edit' }) },
      dismiss: { mutationOptions: (o: object) => ({ ...o, name: 'dismiss' }) },
    },
  })),
}))

const { CommunitySection } =
  await import('~/modules/appCatalog/ui/detail/CommunitySection')

const note = {
  id: 'c1',
  authorName: 'Merry Mole',
  body: 'This portal only covers one business unit.',
  subject: null,
  resourceSlug: 'example-app',
  resourceName: 'Example App',
  attachmentIds: [] as string[],
  createdAt: '2026-10-10T10:00:00.000Z',
  reviewedAt: null as string | null,
  editedAt: null,
  isMine: false,
  isSystem: false,
  canEditUntil: null as string | null,
  status: null as string | null,
  reviewerReply: null as string | null,
}

function mount(claims: Claim[] = []) {
  render(
    <CommunitySection
      target={{ resourceSlug: 'example-app' }}
      appName="Example App"
      claims={claims}
    />,
  )
}

const items = () =>
  screen.getByRole('list', { name: 'Comments' }).querySelectorAll(':scope > li')
const texts = () =>
  [...items()].map((li) => li.querySelector('.comment__text')?.textContent)

beforeEach(() => {
  state.items = []
  state.calls = []
})

describe('CommunitySection — the Comments feed', () => {
  it('has a Comments heading and none of the old sub-sections', () => {
    state.items = [{ ...note }, { ...note, id: 'c2', status: 'applied' }]
    mount([
      { text: 'Archived.', addedAt: '2026-08-03', status: 'archived' },
      { text: 'Fact.', addedAt: '2026-08-03', status: 'active' },
    ])
    expect(screen.getByRole('heading', { name: 'Comments' })).toBeVisible()
    for (const name of [
      /Notes in review/,
      /Facts we rely on/,
      /Answered/,
      /Archived/,
    ]) {
      expect(screen.queryByRole('heading', { name })).toBeNull()
      expect(screen.queryByText(name)).toBeNull()
    }
  })

  it('shows a note once, with its claim’s badge, newest first', () => {
    state.items = [
      {
        ...note,
        id: 'old',
        body: 'Older open note.',
        createdAt: '2026-10-01T09:00:00Z',
      },
      {
        ...note,
        id: 'used',
        body: 'Leads approve.',
        status: 'applied',
        createdAt: '2026-10-12T09:00:00Z',
      },
    ]
    mount([
      {
        text: 'Team leads approve access.',
        addedAt: '2026-10-13',
        origin: 'feedback:used',
        status: 'active',
      },
      { text: 'No longer true.', addedAt: '2026-10-14', status: 'archived' },
    ])
    expect(texts()).toEqual(['Leads approve.', 'Older open note.'])
    const [first, second] = [...items()] as HTMLElement[]
    expect(within(first!).getByText('Used as source')).toBeVisible()
    expect(within(second!).getByText('Pending')).toBeVisible()
    expect(screen.queryByText('Team leads approve access.')).toBeNull()
    expect(screen.queryByText('No longer true.')).toBeNull()
  })

  it('puts who and when above the text, with the raw date in a title', () => {
    state.items = [{ ...note }]
    mount()
    const meta = items()[0]!.querySelector('.comment__meta')!
    expect(meta).toHaveTextContent(/^Merry Mole · /)
    expect(within(meta as HTMLElement).getByTitle(note.createdAt)).toBeVisible()
    expect(
      meta.compareDocumentPosition(
        items()[0]!.querySelector('.comment__text')!,
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows a reviewed note’s reply under it, with no badge', () => {
    state.items = [
      {
        ...note,
        status: 'acknowledged',
        reviewerReply: 'Not in the portal today.',
      },
    ]
    mount()
    expect(screen.getByText('↳ Not in the portal today.')).toBeVisible()
    expect(screen.queryByText('Pending')).toBeNull()
    expect(screen.queryByText('Used as source')).toBeNull()
  })

  it('shows a claim with no note in the list by its origin', () => {
    mount([
      {
        text: 'Old boards are read-only.',
        addedAt: '2026-10-15',
        origin: 'Tools team',
        status: 'review',
      },
    ])
    expect(texts()).toEqual(['Old boards are read-only.'])
    expect(items()[0]).toHaveTextContent(/^Tools team · .*Pending/)
  })

  it('renders nothing in the list when there is nothing said yet', () => {
    mount()
    expect(screen.queryByRole('list', { name: 'Comments' })).toBeNull()
  })

  it('shows a note’s screenshots under its text', () => {
    state.items = [{ ...note, body: null, attachmentIds: ['img-1'] }]
    mount()
    expect(screen.getByText(/Screenshot only/)).toBeVisible()
    expect(
      screen.getByRole('img', { name: 'Attached screenshot' }),
    ).toBeVisible()
  })

  it('says so when a note arrived with no words and no image', () => {
    state.items = [{ ...note, body: null }]
    mount()
    expect(screen.getByText(/no detail given/)).toBeInTheDocument()
  })

  it('offers Dismiss on your own open note, and not once it is answered', () => {
    state.items = [{ ...note, isMine: true }]
    const { unmount } = render(
      <CommunitySection
        target={{ resourceSlug: 'example-app' }}
        appName="Example App"
      />,
    )
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    unmount()

    state.items = [{ ...note, isMine: true, status: 'applied' }]
    mount()
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
  })

  it('offers Edit within the hour on your own note', () => {
    state.items = [
      {
        ...note,
        isMine: true,
        canEditUntil: new Date(Date.now() + 60_000).toISOString(),
      },
    ]
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const box = screen.getByDisplayValue(
      'This portal only covers one business unit.',
    )
    expect(box).toHaveFocus()
    fireEvent.change(box, { target: { value: '  Covers two units now. ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(state.calls).toEqual([
      ['edit', { id: 'c1', body: 'Covers two units now.' }],
    ])
  })

  it('withdraws your own open note through feedback.dismiss', () => {
    state.items = [{ ...note, isMine: true }]
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(state.calls).toEqual([['dismiss', { id: 'c1' }]])
  })

  it('renders claims with the same text without key warnings', () => {
    const spy = vi.spyOn(console, 'error')
    mount([
      { text: 'Single sign-on.', addedAt: '2026-10-01', status: 'active' },
      { text: 'Single sign-on.', addedAt: '2026-10-01', status: 'active' },
    ])
    expect(screen.getAllByText('Single sign-on.')).toHaveLength(2)
    expect(spy).not.toHaveBeenCalledWith(expect.stringMatching(/same key/))
    spy.mockRestore()
  })

  it('shows a skeleton with aria-busy while loading', async () => {
    const { useQuery } = await import('@tanstack/react-query')
    vi.mocked(useQuery).mockReturnValueOnce({
      data: undefined,
      error: null,
      isPending: true,
    } as never)
    mount()
    const status = screen.getByText('Loading comments…')
    expect(status).toBeInTheDocument()
    const skeleton = status.closest('.comments-skeleton')
    expect(skeleton).toHaveAttribute('aria-busy', 'true')
  })

  it('replaces the skeleton with the feed once data arrives', async () => {
    const { useQuery } = await import('@tanstack/react-query')
    vi.mocked(useQuery).mockReturnValueOnce({
      data: undefined,
      error: null,
      isPending: true,
    } as never)
    const { unmount } = render(
      <CommunitySection
        target={{ resourceSlug: 'example-app' }}
        appName="Example App"
      />,
    )
    expect(screen.getByText('Loading comments…')).toBeInTheDocument()
    unmount()

    state.items = [{ ...note }]
    mount()
    expect(screen.queryByText('Loading comments…')).toBeNull()
    expect(screen.getByRole('list', { name: 'Comments' })).toBeVisible()
  })

  it('shows an empty-state message when there are no entries', () => {
    mount()
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Comments' })).toBeNull()
  })
})
