import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const state = vi.hoisted(() => ({
  sent: [] as unknown[],
  fail: false,
  invalidated: 0,
}))

vi.mock('@tanstack/react-query', async () => {
  const React = await import('react')
  return {
    // A real error state, so the component's failure branch is reachable.
    useMutation: vi.fn((options?: { onSuccess?: () => void }) => {
      const [isError, setIsError] = React.useState(false)
      return {
        mutate: (vars: unknown) => {
          state.sent.push(vars)
          if (state.fail) setIsError(true)
          else options?.onSuccess?.()
        },
        isPending: false,
        isError,
      }
    }),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: () => {
        state.invalidated++
      },
    })),
  }
})
vi.mock('~/api/infra/trpc', () => ({
  useTRPC: vi.fn(() => ({
    feedback: {
      add: { mutationOptions: (o: unknown) => o },
      list: { queryKey: () => ['feedback', 'list'] },
    },
  })),
}))

const { KnowMoreInput } =
  await import('~/modules/appCatalog/ui/detail/KnowMoreInput')

beforeEach(() => {
  state.sent = []
  state.fail = false
  state.invalidated = 0
})

const field = () =>
  screen.getByRole('textbox', { name: 'Know something more about Team Board?' })
const send = () => screen.getByText('Send')

describe('KnowMoreInput', () => {
  it('shows Send only once there is text', async () => {
    render(<KnowMoreInput appSlug="team-board" appName="Team Board" />)
    expect(send().closest('.know-more-field')).not.toHaveClass('is-typing')
    expect(send()).toHaveAttribute('aria-hidden', 'true')
    await userEvent.type(field(), 'A fact')
    expect(send().closest('.know-more-field')).toHaveClass('is-typing')
    expect(send()).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('treats whitespace as empty: no Send, Enter sends nothing', async () => {
    render(<KnowMoreInput appSlug="team-board" appName="Team Board" />)
    await userEvent.type(field(), '   {Enter}')
    expect(send().closest('.know-more-field')).not.toHaveClass('is-typing')
    expect(state.sent).toEqual([])
  })

  it('Enter sends the trimmed text in place and clears the field', async () => {
    render(<KnowMoreInput appSlug="team-board" appName="Team Board" />)
    await userEvent.type(field(), '  Lead approves access. {Enter}')
    expect(state.sent).toEqual([
      { resourceSlug: 'team-board', body: 'Lead approves access.' },
    ])
    expect(field()).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent(/Thanks — sent/)
    expect(state.invalidated).toBe(1)
  })

  it('Shift+Enter adds a line instead of sending', async () => {
    render(<KnowMoreInput appSlug="team-board" appName="Team Board" />)
    await userEvent.type(field(), 'one{Shift>}{Enter}{/Shift}two')
    expect(state.sent).toEqual([])
    expect(field()).toHaveValue('one\ntwo')
  })

  it('does not send while an IME composition is open', async () => {
    render(<KnowMoreInput appSlug="team-board" appName="Team Board" />)
    await userEvent.type(field(), 'kanji')
    field().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        isComposing: true,
      }),
    )
    expect(state.sent).toEqual([])
  })

  it('keeps the text and says so when the send fails', async () => {
    state.fail = true
    render(<KnowMoreInput appSlug="team-board" appName="Team Board" />)
    await userEvent.type(field(), 'Lead approves access.{Enter}')
    expect(field()).toHaveValue('Lead approves access.')
    expect(screen.getByRole('alert')).toHaveTextContent(/Could not send/)
  })
})
