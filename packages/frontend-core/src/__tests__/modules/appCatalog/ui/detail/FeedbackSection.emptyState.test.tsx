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

describe('FeedbackSection — composer', () => {
  it('stays closed until something asks for it', () => {
    state.items = []
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()
    // The affordance lives in the card's band now, not in this panel — down here
    // it was below the fold of a tab, which is why it moved.
    expect(
      screen.queryByRole('button', { name: /Suggest a change/ }),
    ).toBeNull()
  })

  it('opens and takes the caret when the band asks', () => {
    state.items = []
    render(<FeedbackSection appSlug="example-app" openComposer={1} />)

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
    render(<FeedbackSection appSlug="example-app" openComposer={1} />)

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
    const first = render(
      <FeedbackSection appSlug="example-app" openComposer={1} />,
    )

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

  /**
   * The composer closes itself on send, so the band has to be able to say "again".
   * It used to pass a boolean, which cannot: the second click left the prop at
   * `true`, the effect did not re-run, and the button was dead for the rest of the
   * card's life — you could file one correction per entry and no more. Caught by
   * sending twice in a real browser, which is the only place it showed.
   */
  it('reopens for a second request after the first one was sent', async () => {
    sessionStorage.clear()
    state.items = []
    state.sent = []
    const view = render(
      <FeedbackSection appSlug="example-app" openComposer={1} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()

    // The band asking a second time — a new count, same requested tab.
    view.rerender(<FeedbackSection appSlug="example-app" openComposer={2} />)
    expect(
      screen.getByPlaceholderText('What should change?'),
    ).toBeInTheDocument()
  })

  it('does not leak a draft between entries, and clears it once sent', async () => {
    sessionStorage.clear()
    state.items = []
    state.sent = []
    const first = render(
      <FeedbackSection appSlug="example-app" openComposer={1} />,
    )
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
