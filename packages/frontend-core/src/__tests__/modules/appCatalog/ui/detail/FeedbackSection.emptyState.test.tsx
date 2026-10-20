import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The section only needs the list query here; the whole tRPC/react-query stack is
// stubbed down to that so the composer's own behaviour is the only thing under test.
const state = vi.hoisted(() => ({
  items: [] as unknown[],
  sent: [] as unknown[],
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { items: state.items, openCount: 0 },
    isLoading: false,
  })),
  // `mutate` runs the success callback, so the stub can represent a completed send
  // and not just an attempted one. Without that, anything the component does on
  // success — clearing the stored draft, closing the composer — is unreachable from
  // a test, and a fixture that cannot express success quietly stops guarding it.
  useMutation: vi.fn((options?: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      state.sent.push(vars)
      options?.onSuccess?.()
    },
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))
vi.mock('~/api/infra/trpc', () => ({
  useTRPC: vi.fn(() => ({
    feedback: {
      list: { queryOptions: () => ({ queryKey: ['feedback'] }) },
      add: { mutationOptions: (o: unknown) => o },
      edit: { mutationOptions: (o: unknown) => o },
      dismiss: { mutationOptions: (o: unknown) => o },
    },
  })),
}))

const { FeedbackSection } =
  await import('~/modules/appCatalog/ui/detail/FeedbackSection')

const openFullComposer = () =>
  userEvent.click(
    screen.getByRole('button', {
      name: 'Attach images or write a longer note',
    }),
  )

describe('FeedbackSection — composer', () => {
  it('stays closed until something asks for it', () => {
    state.items = []
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()
    expect(
      screen.getByRole('button', {
        name: 'Attach images or write a longer note',
      }),
    ).toBeInTheDocument()
  })

  it('opens and takes the caret when asked', async () => {
    state.items = []
    render(<FeedbackSection appSlug="example-app" />)
    await openFullComposer()

    const field = screen.getByPlaceholderText('What should change?')
    expect(field).toBeInTheDocument()
    expect(field).toHaveFocus()
  })

  it('does not auto-open just because feedback exists', () => {
    state.items = [
      {
        id: 'c1',
        authorName: 'Curious Ferret',
        body: 'Useful.',
        subject: null,
        resourceSlug: 'example-app',
        resourceName: 'Example App',
        attachmentIds: [],
        createdAt: new Date().toISOString(),
        reviewedAt: null,
        editedAt: null,
        isMine: false,
        canEditUntil: null,
        status: null,
        reviewerReply: null,
      },
    ]
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()
  })

  it('sends with nothing typed — a bare flag is a valid signal', async () => {
    state.items = []
    state.sent = []
    render(<FeedbackSection appSlug="example-app" />)
    await openFullComposer()

    const send = screen.getByRole('button', { name: 'Send' })
    // The whole point: no words, no image, still submittable.
    expect(send).toBeEnabled()

    await userEvent.click(send)
    expect(state.sent).toEqual([{ resourceSlug: 'example-app', body: '' }])
  })

  /**
   * The detail card mounts this inside a tab panel, and a panel is unmounted while
   * its tab is inactive — so an unmount is a routine event here, not an edge case.
   * Component state alone would drop whatever someone had typed.
   */
  it('keeps a half-typed draft across an unmount, and reopens the composer for it', async () => {
    sessionStorage.clear()
    state.items = []
    const first = render(<FeedbackSection appSlug="example-app" />)
    await openFullComposer()

    await userEvent.type(
      screen.getByPlaceholderText('What should change?'),
      'half a thought',
    )

    // Leaving the tab unmounts the panel.
    first.unmount()
    render(<FeedbackSection appSlug="example-app" />)

    const recovered = screen.getByPlaceholderText('What should change?')
    expect(recovered).toHaveValue('half a thought')
  })

  /** The composer closes itself on send; filing a second note must still work. */
  it('reopens for a second request after the first one was sent', async () => {
    sessionStorage.clear()
    state.items = []
    state.sent = []
    render(<FeedbackSection appSlug="example-app" />)
    await openFullComposer()

    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()

    await openFullComposer()
    expect(
      screen.getByPlaceholderText('What should change?'),
    ).toBeInTheDocument()
  })

  it('does not leak a draft between entries, and clears it once sent', async () => {
    sessionStorage.clear()
    state.items = []
    state.sent = []
    const first = render(<FeedbackSection appSlug="example-app" />)
    await openFullComposer()
    await userEvent.type(
      screen.getByPlaceholderText('What should change?'),
      'about this one',
    )
    first.unmount()

    // A different entry starts clean rather than inheriting the neighbour's draft.
    const other = render(<FeedbackSection appSlug="other-app" />)
    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()
    other.unmount()

    // Back on the original, send it, and the stored draft goes with it.
    render(<FeedbackSection appSlug="example-app" />)
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(state.sent).toEqual([
      { resourceSlug: 'example-app', body: 'about this one' },
    ])
    expect(sessionStorage.getItem('ac.feedback.draft.example-app')).toBeNull()
  })
})
