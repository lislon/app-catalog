import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const state = vi.hoisted(() => ({ sent: [] as unknown[] }))

vi.mock('@tanstack/react-query', () => ({
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
      add: { mutationOptions: (o: unknown) => o },
      mine: { queryKey: () => ['feedback', 'mine'] },
    },
  })),
}))

const { RequestAppDialog } =
  await import('~/modules/appCatalog/ui/catalog/RequestAppDialog')

describe('RequestAppDialog', () => {
  /**
   * The grid is rendered bare in several tests with no TRPCProvider, so the closed
   * dialog must not reach a tRPC hook. A hook cannot be called conditionally, which is
   * why the gate is a component boundary — and why this test exists: inlining the body
   * back into one component breaks six unrelated grid tests with
   * "useTRPC() can only be used inside of a <TRPCProvider>".
   */
  it('mounts nothing at all while closed', () => {
    const { container } = render(
      <RequestAppDialog open={false} onOpenChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('pre-fills what the visitor searched for', () => {
    render(
      <RequestAppDialog
        open
        onOpenChange={() => {}}
        initialSubject="hoppy budget tool"
      />,
    )
    // They just typed it into the search box; asking again is a toll on the one
    // person who already told us what is missing.
    expect(screen.getByLabelText(/What are you looking for/)).toHaveValue(
      'hoppy budget tool',
    )
  })

  it('refuses to send with no name, then sends a catalog-level ask', async () => {
    state.sent = []
    render(<RequestAppDialog open onOpenChange={() => {}} initialSubject="" />)

    const send = screen.getByRole('button', { name: /Send request/ })
    expect(send).toBeDisabled()

    await userEvent.type(
      screen.getByLabelText(/What are you looking for/),
      'Grafana',
    )
    await userEvent.click(screen.getByRole('button', { name: /Send request/ }))

    // No resourceSlug: that is what makes it a request for something absent rather
    // than feedback on an existing entry. The server splits them the same way.
    expect(state.sent).toEqual([{ subject: 'Grafana' }])
  })

  it('carries the optional detail when given, and omits it when blank', async () => {
    state.sent = []
    render(
      <RequestAppDialog
        open
        onOpenChange={() => {}}
        initialSubject="Grafana"
      />,
    )
    await userEvent.type(
      screen.getByLabelText(/Anything that would help/),
      'the observability team runs it',
    )
    await userEvent.click(screen.getByRole('button', { name: /Send request/ }))

    expect(state.sent).toEqual([
      { subject: 'Grafana', body: 'the observability team runs it' },
    ])
  })

  it('confirms rather than leaving them wondering whether it sent', async () => {
    state.sent = []
    render(
      <RequestAppDialog
        open
        onOpenChange={() => {}}
        initialSubject="Grafana"
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /Send request/ }))

    // Reporting into silence is how a person learns not to bother.
    expect(screen.getByText(/that is logged/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send request/ })).toBeNull()
  })
})
