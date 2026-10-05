import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stub shape as the empty-state test: only the list query matters here.
const state = vi.hoisted(() => ({
  items: [] as unknown[],
  openCount: 0,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { items: state.items, openCount: state.openCount },
    isLoading: false,
  })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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

const base = {
  id: 'c1',
  authorName: 'Merry Mole',
  body: 'This portal only covers one business unit.',
  subject: null,
  resourceSlug: 'example-app',
  resourceName: 'Example App',
  attachmentIds: [] as string[],
  createdAt: new Date().toISOString(),
  reviewedAt: null as string | null,
  editedAt: null,
  isMine: false,
  canEditUntil: null,
  status: null as string | null,
  reviewerReply: null as string | null,
}

describe('FeedbackSection — review status', () => {
  it('credits applied work with a short label, not a sentence', () => {
    state.items = [{ ...base, status: 'applied' }]
    state.openCount = 0
    render(<FeedbackSection appSlug="example-app" />)

    // Exactly one: the chip on the row. There is no legend restating it, and the
    // gratitude lives in the reply prose rather than inside the pill.
    expect(screen.getAllByText('Applied')).toHaveLength(1)
    expect(screen.queryByText(/thank you!/)).toBeNull()
    expect(screen.queryByText(/means the catalog now carries/)).toBeNull()
  })

  it('shows the quieter label for feedback that changed nothing', () => {
    state.items = [{ ...base, status: 'acknowledged' }]
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.getAllByText('Seen')).toHaveLength(1)
  })

  it('renders the maintainer reply under the row', () => {
    state.items = [
      {
        ...base,
        status: 'applied',
        reviewerReply: 'Folded into Background — thank you.',
      },
    ]
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.getByText('Catalog team')).toBeInTheDocument()
    expect(
      screen.getByText('Folded into Background — thank you.'),
    ).toBeInTheDocument()
  })

  it('gives an unreviewed row no chip at all — absence is the signal', () => {
    state.items = [base]
    state.openCount = 1
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.queryByText('Applied')).toBeNull()
    expect(screen.queryByText('Seen')).toBeNull()
    expect(screen.queryByText('Open')).toBeNull()
    expect(screen.queryByText('Catalog team')).toBeNull()
  })

  it('counts unreviewed items on the heading, and hides the count at zero', () => {
    state.items = [base]
    state.openCount = 2
    const { unmount } = render(<FeedbackSection appSlug="example-app" />)
    expect(screen.getByLabelText('2 awaiting review')).toHaveTextContent(
      '2 open',
    )
    unmount()

    state.openCount = 0
    render(<FeedbackSection appSlug="example-app" />)
    expect(screen.queryByText(/open$/)).toBeNull()
  })

  it('offers Dismiss on your own unreviewed row, and not once it is answered', () => {
    state.items = [{ ...base, isMine: true }]
    state.openCount = 1
    const { unmount } = render(<FeedbackSection appSlug="example-app" />)
    // No edit window left, but withdrawing is still allowed while nobody has acted.
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    unmount()

    state.items = [{ ...base, isMine: true, status: 'applied' }]
    render(<FeedbackSection appSlug="example-app" />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
  })

  it('says so when someone sent a bare flag with no words', () => {
    state.items = [{ ...base, body: null }]
    render(<FeedbackSection appSlug="example-app" />)

    expect(screen.getByText(/no detail given/)).toBeInTheDocument()
  })
})
