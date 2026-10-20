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
  canEditUntil: null as string | null,
  status: null as string | null,
  reviewerReply: null as string | null,
}

function mount(claims: Claim[] = []) {
  render(
    <CommunitySection
      appSlug="example-app"
      appName="Example App"
      claims={claims}
    />,
  )
}

/** The sub-section under a heading, by the heading's leading text. */
function group(title: string): HTMLElement {
  return screen
    .getByRole('heading', { name: new RegExp(`^${title}`) })
    .closest('section')!
}
const rowTexts = (el: HTMLElement) =>
  within(el)
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.community-row__text')?.textContent)

beforeEach(() => {
  state.items = []
  state.calls = []
})

describe('CommunitySection — grouped lists', () => {
  it('puts open notes and review claims under Notes in review, newest first', () => {
    state.items = [
      {
        ...note,
        id: 'a',
        body: 'Older note.',
        createdAt: '2026-10-01T09:00:00Z',
      },
      {
        ...note,
        id: 'b',
        body: 'Newest note.',
        createdAt: '2026-10-12T09:00:00Z',
      },
    ]
    mount([
      { text: 'A claim in review.', addedAt: '2026-10-05', status: 'review' },
    ])
    const review = group('Notes in review')
    // The name and the count are separate words, not "Notes in review3".
    expect(within(review).getByRole('heading')).toHaveTextContent(
      /^Notes in review 3$/,
    )
    expect(rowTexts(review)).toEqual([
      'Newest note.',
      'A claim in review.',
      'Older note.',
    ])
  })

  it('lists active claims under Facts we rely on, with origin and date', () => {
    mount([
      {
        text: 'Lead approves access.',
        addedAt: '2026-10-12',
        origin: 'feedback:abc',
        status: 'active',
      },
      {
        text: 'Old boards are read-only.',
        addedAt: '2026-10-15',
        origin: 'Tools team',
        status: 'active',
      },
    ])
    const facts = group('Facts we rely on')
    expect(rowTexts(facts)).toEqual([
      'Lead approves access.',
      'Old boards are read-only.',
    ])
    expect(
      within(facts).getByText('from visitor feedback · 2026-10-12'),
    ).toBeVisible()
    expect(within(facts).getByText('Tools team · 2026-10-15')).toBeVisible()
    expect(screen.queryByText(/feedback:abc/)).toBeNull()
  })

  it('puts reviewed notes under Answered, with the reply under the text', () => {
    state.items = [
      {
        ...note,
        status: 'applied',
        reviewerReply: 'Folded into Background — thank you.',
      },
    ]
    mount()
    const answered = group('Answered')
    expect(rowTexts(answered)).toEqual([
      'This portal only covers one business unit.',
    ])
    expect(
      within(answered).getByText('Folded into Background — thank you.'),
    ).toBeVisible()
    expect(within(answered).getAllByText('Applied')).toHaveLength(1)
  })

  it('shows the quieter label for a note that changed nothing', () => {
    state.items = [{ ...note, status: 'acknowledged' }]
    mount()
    expect(within(group('Answered')).getByText('Seen')).toBeVisible()
  })

  it('folds archived claims away, struck through, with their reason', () => {
    mount([
      {
        text: 'No mobile app.',
        addedAt: '2026-08-03',
        status: 'archived',
        archiveReason: 'superseded by https://example.com/guide',
        archivedAt: '2026-10-02',
      },
      { text: 'Legacy claim.', addedAt: '2026-01-01', status: 'archived' },
    ])
    const summary = screen.getByText('Archived (2)')
    expect(screen.getByText('No mobile app.')).not.toBeVisible()
    fireEvent.click(summary)
    expect(screen.getByText('No mobile app.')).toBeVisible()
    expect(screen.getByText('No mobile app.').closest('li')).toHaveClass(
      'is-archived',
    )
    expect(
      screen.getByText(
        /Archived 2026-10-02 — superseded by https:\/\/example.com\/guide/,
      ),
    ).toBeVisible()
    expect(screen.queryByText(/undefined/)).toBeNull()
  })

  it('hides every sub-section that has nothing in it', () => {
    mount()
    for (const title of [
      /^Notes in review/,
      /^Facts we rely on/,
      /^Answered/,
    ]) {
      expect(screen.queryByRole('heading', { name: title })).toBeNull()
    }
    expect(screen.queryByText(/^Archived/)).toBeNull()
  })

  it('shows who and when on each note', () => {
    state.items = [{ ...note, createdAt: new Date().toISOString() }]
    mount()
    expect(
      within(group('Notes in review')).getByText(/^Merry Mole · /),
    ).toHaveClass('community-row__meta')
  })

  it('shows a note’s screenshots under its text', () => {
    state.items = [{ ...note, body: null, attachmentIds: ['img-1'] }]
    mount()
    const review = group('Notes in review')
    expect(within(review).getByText(/Screenshot only/)).toBeVisible()
    expect(
      within(review).getByRole('img', { name: 'Attached screenshot' }),
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
      <CommunitySection appSlug="example-app" appName="Example App" />,
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
      { text: 'Single sign-on.', addedAt: '2026-10-05', status: 'active' },
    ])
    expect(screen.getAllByText('Single sign-on.')).toHaveLength(2)
    expect(spy).not.toHaveBeenCalledWith(expect.stringMatching(/same key/))
    spy.mockRestore()
  })
})
