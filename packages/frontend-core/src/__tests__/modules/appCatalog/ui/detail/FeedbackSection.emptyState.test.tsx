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
  useMutation: vi.fn(() => ({
    mutate: (vars: unknown) => state.sent.push(vars),
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

const SUGGEST = 'Suggest a change'

describe('FeedbackSection — composer', () => {
  it('keeps the composer behind the invitation until it is clicked', async () => {
    state.items = []
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()

    await userEvent.click(
      screen.getByRole('button', { name: /Suggest a change/ }),
    )

    const field = screen.getByPlaceholderText('What should change?')
    expect(field).toBeInTheDocument()
    // Focus follows the click, never the mount — the click is what earns the caret.
    expect(field).toHaveFocus()
    // One affordance at a time: the button hides once it has done its job.
    expect(
      screen.queryByRole('button', { name: new RegExp(SUGGEST) }),
    ).toBeNull()
  })

  it('offers the same single affordance when feedback already exists', () => {
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

    // Not auto-opened, and no second label for the same action.
    expect(screen.queryByPlaceholderText('What should change?')).toBeNull()
    expect(
      screen.getByRole('button', { name: new RegExp(SUGGEST) }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add a note' })).toBeNull()
  })

  it('sends with nothing typed — a bare flag is a valid signal', async () => {
    state.items = []
    state.sent = []
    render(<FeedbackSection appSlug="example-app" />)

    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(SUGGEST) }),
    )

    const send = screen.getByRole('button', { name: 'Send' })
    // The whole point: no words, no image, still submittable.
    expect(send).toBeEnabled()

    await userEvent.click(send)
    expect(state.sent).toEqual([{ resourceSlug: 'example-app', body: '' }])
  })
})
