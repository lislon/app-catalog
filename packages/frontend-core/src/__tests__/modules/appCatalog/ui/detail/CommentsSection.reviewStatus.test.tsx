import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stub shape as the empty-state test: only the list query matters here.
const state = vi.hoisted(() => ({
  comments: [] as unknown[],
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: state.comments, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))
vi.mock('~/api/infra/trpc', () => ({
  useTRPC: vi.fn(() => ({
    comments: {
      list: { queryOptions: () => ({ queryKey: ['comments'] }) },
      add: { mutationOptions: (o: unknown) => o },
      edit: { mutationOptions: (o: unknown) => o },
      remove: { mutationOptions: (o: unknown) => o },
    },
  })),
}))

const { CommentsSection } =
  await import('~/modules/appCatalog/ui/detail/CommentsSection')

const base = {
  id: 'c1',
  authorName: 'Merry Mole',
  body: 'This portal only covers one business unit.',
  createdAt: new Date().toISOString(),
  editedAt: null,
  isMine: false,
  canEditUntil: null,
  status: null as string | null,
  reviewerReply: null as string | null,
}

/** The chip text, minus the legend's two sample chips. */
function chips(name: RegExp) {
  return screen.getAllByText(name)
}

describe('CommentsSection — review status', () => {
  it('credits an applied comment and explains the label', () => {
    state.comments = [{ ...base, status: 'applied' }]
    render(<CommentsSection appSlug="example-app" />)

    // One on the comment, one in the legend.
    expect(chips(/Applied — thank you!/)).toHaveLength(2)
    expect(
      screen.getByText(/means the comment improved this entry/),
    ).toBeInTheDocument()
  })

  it('shows the quieter label for a comment that changed nothing', () => {
    state.comments = [{ ...base, status: 'acknowledged' }]
    render(<CommentsSection appSlug="example-app" />)

    expect(chips(/^Seen$/)).toHaveLength(2)
    expect(screen.getByText(/left the entry as it was/)).toBeInTheDocument()
  })

  it('renders the maintainer reply under the comment', () => {
    state.comments = [
      {
        ...base,
        status: 'applied',
        reviewerReply: 'Folded into Background — thank you.',
      },
    ]
    render(<CommentsSection appSlug="example-app" />)

    expect(screen.getByText('Catalog team')).toBeInTheDocument()
    expect(
      screen.getByText('Folded into Background — thank you.'),
    ).toBeInTheDocument()
  })

  it('stays silent on an unreviewed comment — no chip, no legend', () => {
    state.comments = [base]
    render(<CommentsSection appSlug="example-app" />)

    expect(screen.queryByText(/Applied — thank you!/)).toBeNull()
    expect(screen.queryByText(/^Seen$/)).toBeNull()
    expect(
      screen.queryByText(/means the comment improved this entry/),
    ).toBeNull()
    expect(screen.queryByText('Catalog team')).toBeNull()
  })
})
