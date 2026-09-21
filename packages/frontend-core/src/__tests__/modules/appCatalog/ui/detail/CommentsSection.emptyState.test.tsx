import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The section only needs a comment list here; the whole tRPC/react-query stack is
// stubbed down to that one query so the empty state is the only thing under test.
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

describe('CommentsSection — empty state', () => {
  it('keeps the composer behind "Be the first." until it is clicked', async () => {
    state.comments = []
    render(<CommentsSection appSlug="example-app" />)

    const invite = screen.getByRole('button', { name: 'Be the first.' })
    expect(screen.queryByPlaceholderText('Leave a comment…')).toBeNull()

    await userEvent.click(invite)

    const field = screen.getByPlaceholderText('Leave a comment…')
    expect(field).toBeInTheDocument()
    expect(field).toHaveFocus()
    // One affordance at a time: the invite hides itself once it has done its job.
    expect(screen.queryByRole('button', { name: 'Be the first.' })).toBeNull()
  })

  it('shows the composer straight away once comments exist, without stealing focus', () => {
    state.comments = [
      {
        id: 'c1',
        authorName: 'Curious Ferret',
        body: 'Useful.',
        createdAt: new Date().toISOString(),
      },
    ]
    render(<CommentsSection appSlug="example-app" />)

    const field = screen.getByPlaceholderText('Leave a comment…')
    expect(field).toBeInTheDocument()
    expect(field).not.toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Be the first.' })).toBeNull()
  })
})
