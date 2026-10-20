import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const state = vi.hoisted(() => ({
  sent: [] as unknown[],
  fail: false,
  invalidated: 0,
}))

vi.mock('@tanstack/react-query', async () => {
  const React = await import('react')
  return {
    useQuery: vi.fn(() => ({
      data: { items: [], openCount: 0 },
      isLoading: false,
    })),
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
        error: null,
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
      edit: { mutationOptions: (o: unknown) => o },
      dismiss: { mutationOptions: (o: unknown) => o },
      list: {
        queryOptions: () => ({ queryKey: ['feedback', 'list'] }),
        queryKey: () => ['feedback', 'list'],
      },
    },
  })),
}))

const { CommunitySection } =
  await import('~/modules/appCatalog/ui/detail/CommunitySection')

/** The upload endpoint answers with one id per file, in order. */
let uploads = 0
beforeEach(() => {
  state.sent = []
  state.fail = false
  state.invalidated = 0
  uploads = 0
  sessionStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: { body: FormData }) => {
      const ids = init.body.getAll('image').map(() => `img-${++uploads}`)
      return Promise.resolve(
        new Response(JSON.stringify({ ids }), { status: 201 }),
      )
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const mount = () =>
  render(<CommunitySection appSlug="team-board" appName="Team Board" />)
const field = () =>
  screen.getByRole('textbox', { name: 'Know more about Team Board?' })
const send = () => screen.getByText('Send')
const png = (name: string) =>
  new File([new Uint8Array([1])], name, { type: 'image/png' })
const pasteImage = (name = 'shot.png') =>
  fireEvent.paste(field(), { clipboardData: { files: [png(name)] } })

describe('CommunitySection — the input', () => {
  it('shows Send and the note line on first focus, and keeps them', async () => {
    mount()
    const form = field().closest('form')!
    expect(form).not.toHaveAttribute('data-engaged')
    expect(send()).toHaveAttribute('aria-hidden', 'true')

    await userEvent.click(field())
    expect(form).toHaveAttribute('data-engaged')
    expect(send()).not.toHaveAttribute('aria-hidden')
    expect(
      screen.getByText('A maintainer reads every note and updates the card.'),
    ).toBeInTheDocument()

    field().blur()
    expect(form).toHaveAttribute('data-engaged')
  })

  it('keeps Send disabled until there is text or an image', async () => {
    mount()
    await userEvent.click(field())
    expect(send()).toBeDisabled()
    await userEvent.type(field(), '   ')
    expect(send()).toBeDisabled()
    await userEvent.type(field(), 'A fact')
    expect(send()).toBeEnabled()
  })

  it('treats whitespace as empty: Enter sends nothing', async () => {
    mount()
    await userEvent.type(field(), '   {Enter}')
    expect(state.sent).toEqual([])
  })

  it('shows the hint only while there is text', async () => {
    mount()
    const hint = screen.getByText(
      'Enter sends · Shift+Enter new line · Esc clears · paste or drop a screenshot',
    )
    await userEvent.click(field())
    expect(hint).not.toHaveClass('is-on')
    await userEvent.type(field(), 'Text')
    expect(hint).toHaveClass('is-on')
    await userEvent.type(field(), '{Escape}')
    expect(hint).not.toHaveClass('is-on')
  })

  it('Enter sends the trimmed text in place and clears the field', async () => {
    mount()
    await userEvent.type(field(), '  Lead approves access. {Enter}')
    expect(state.sent).toEqual([
      { resourceSlug: 'team-board', body: 'Lead approves access.' },
    ])
    expect(field()).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent(/Thanks — sent/)
    expect(state.invalidated).toBe(1)
  })

  it('Shift+Enter adds a line instead of sending', async () => {
    mount()
    await userEvent.type(field(), 'one{Shift>}{Enter}{/Shift}two')
    expect(state.sent).toEqual([])
    expect(field()).toHaveValue('one\ntwo')
  })

  it('does not send while an IME composition is open', async () => {
    mount()
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
    mount()
    await userEvent.type(field(), 'Lead approves access.{Enter}')
    expect(field()).toHaveValue('Lead approves access.')
    expect(screen.getByRole('alert')).toHaveTextContent(/Could not send/)
  })

  it('leaves focus in the field after a successful send', async () => {
    mount()
    await userEvent.type(field(), 'Lead approves access.{Enter}')
    expect(field()).toHaveFocus()
  })
})

describe('CommunitySection — screenshots', () => {
  it('has a paperclip button that opens the file picker', () => {
    mount()
    expect(
      screen.getByRole('button', { name: 'Attach a screenshot' }),
    ).toBeInTheDocument()
  })

  it('adds a thumbnail for a pasted image', async () => {
    mount()
    pasteImage('pasted.png')
    expect(await screen.findByRole('img', { name: 'pasted.png' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Remove pasted.png' }),
    ).toBeInTheDocument()
  })

  it('adds a thumbnail for a dropped image', async () => {
    mount()
    fireEvent.drop(field().closest('form')!, {
      dataTransfer: { files: [png('dropped.png')] },
    })
    expect(
      await screen.findByRole('img', { name: 'dropped.png' }),
    ).toBeVisible()
  })

  it('sends an image-only note: attachment ids and no body', async () => {
    mount()
    pasteImage()
    await screen.findByRole('img', { name: 'shot.png' })
    expect(send()).toBeEnabled()
    await userEvent.click(send())
    expect(state.sent).toEqual([
      { resourceSlug: 'team-board', attachmentIds: ['img-1'] },
    ])
    expect(screen.queryByRole('img', { name: 'shot.png' })).toBeNull()
  })

  it('drops a removed thumbnail from the payload', async () => {
    mount()
    pasteImage('a.png')
    await screen.findByRole('img', { name: 'a.png' })
    pasteImage('b.png')
    await screen.findByRole('img', { name: 'b.png' })

    await userEvent.click(screen.getByRole('button', { name: 'Remove a.png' }))
    expect(screen.queryByRole('img', { name: 'a.png' })).toBeNull()

    await userEvent.type(field(), 'With one{Enter}')
    expect(state.sent).toEqual([
      {
        resourceSlug: 'team-board',
        body: 'With one',
        attachmentIds: ['img-2'],
      },
    ])
  })

  it('keeps text and images across an unmount, as a tab switch does', async () => {
    const first = mount()
    await userEvent.type(field(), 'half a thought')
    pasteImage()
    await screen.findByRole('img', { name: 'shot.png' })
    first.unmount()

    mount()
    expect(field()).toHaveValue('half a thought')
    expect(screen.getByRole('img', { name: 'shot.png' })).toBeVisible()
    expect(field().closest('form')).toHaveAttribute('data-engaged')

    await userEvent.type(field(), '{Enter}')
    expect(state.sent).toEqual([
      {
        resourceSlug: 'team-board',
        body: 'half a thought',
        attachmentIds: ['img-1'],
      },
    ])
    expect(sessionStorage.getItem('ac.feedback.draft.team-board')).toBeNull()
    expect(sessionStorage.getItem('ac.feedback.images.team-board')).toBeNull()
  })

  it('does not leak a draft between entries', async () => {
    const first = mount()
    await userEvent.type(field(), 'about this one')
    first.unmount()

    render(<CommunitySection appSlug="other-app" appName="Other" />)
    expect(
      screen.getByRole('textbox', { name: 'Know more about Other?' }),
    ).toHaveValue('')
  })

  it('Esc clears images along with the text', async () => {
    mount()
    pasteImage()
    await screen.findByRole('img', { name: 'shot.png' })
    fireEvent.keyDown(field(), { key: 'Escape' })
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: 'shot.png' })).toBeNull(),
    )
  })
})
