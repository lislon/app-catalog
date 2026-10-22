import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const state = vi.hoisted(() => ({
  sent: [] as unknown[],
  fail: false,
  failMessage: '',
  invalidated: 0,
  /** When set, uploads wait until `release()` is called. */
  hold: false,
  release: () => {},
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
        error: isError ? new Error(state.failMessage) : null,
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
  state.failMessage = ''
  state.invalidated = 0
  state.hold = false
  uploads = 0
  sessionStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: { body: FormData }) => {
      const ids = init.body.getAll('image').map(() => `img-${++uploads}`)
      const reply = () => new Response(JSON.stringify({ ids }), { status: 201 })
      if (!state.hold) return Promise.resolve(reply())
      return new Promise<Response>((resolve) => {
        state.release = () => resolve(reply())
      })
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const mount = () =>
  render(
    <CommunitySection
      target={{ resourceSlug: 'team-board' }}
      appName="Team Board"
    />,
  )
const field = () =>
  screen.getByRole('textbox', { name: 'Know more about Team Board?' })
const send = () => screen.getByText('Send')
const png = (name: string) =>
  new File([new Uint8Array([1])], name, { type: 'image/png' })
const pasteImage = (...names: string[]) =>
  fireEvent.paste(field(), {
    clipboardData: { files: (names.length ? names : ['shot.png']).map(png) },
  })
const dropImage = (name: string) =>
  fireEvent.drop(field().closest('form')!, {
    dataTransfer: { files: [png(name)], types: ['Files'] },
  })
const thumbnails = () =>
  screen.queryAllByRole('button', { name: /^Remove / }).length

describe('CommunitySection — the input', () => {
  it('shows Send at rest, disabled until there is text or an image', async () => {
    mount()
    expect(send()).toBeVisible()
    expect(send()).not.toHaveAttribute('aria-hidden')
    expect(send()).not.toHaveAttribute('tabindex', '-1')
    expect(send()).toBeDisabled()
    await userEvent.type(field(), '   ')
    expect(send()).toBeDisabled()
    await userEvent.type(field(), 'A fact')
    expect(send()).toBeEnabled()
    await userEvent.clear(field())
    expect(send()).toBeDisabled()
    pasteImage()
    await screen.findByRole('img', { name: 'shot.png' })
    expect(send()).toBeEnabled()
  })

  it('treats whitespace as empty: Enter sends nothing', async () => {
    mount()
    await userEvent.type(field(), '   {Enter}')
    expect(state.sent).toEqual([])
  })

  it('shows the hint only while there is text (fine pointer)', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
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

  it('hides the hint line on coarse pointers (touch)', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
    mount()
    await userEvent.click(field())
    await userEvent.type(field(), 'Text')
    expect(
      screen.queryByText(
        'Enter sends · Shift+Enter new line · Esc clears · paste or drop a screenshot',
      ),
    ).toBeNull()
  })

  it('asks for a fact, a fix or a question, with Enter, on fine pointers', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
    mount()
    expect(field()).toHaveAttribute(
      'placeholder',
      'Add a fact, a fix or a question — press Enter',
    )
  })

  it('drops the Enter part on coarse pointers (touch)', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
    mount()
    expect(field()).toHaveAttribute(
      'placeholder',
      'Add a fact, a fix or a question',
    )
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

  it('shows the server’s reason when a send fails with one', async () => {
    state.fail = true
    state.failMessage = 'Up to 3 images'
    mount()
    await userEvent.type(field(), 'Lead approves access.{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not send: Up to 3 images. Your note is still here.',
    )
  })

  it('does not clear the draft on Esc during an IME composition', async () => {
    mount()
    await userEvent.type(field(), 'kanji')
    // fireEvent wraps the dispatch in act, so a clear would have rendered.
    fireEvent.keyDown(field(), { key: 'Escape', isComposing: true })
    expect(field()).toHaveValue('kanji')
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(field()).toHaveValue('')
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
    dropImage('dropped.png')
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

    render(
      <CommunitySection
        target={{ resourceSlug: 'other-app' }}
        appName="Other"
      />,
    )
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

  it('ignores a second paste while the first is uploading, and never exceeds the cap', async () => {
    mount()
    pasteImage('a.png', 'b.png')
    pasteImage('c.png', 'd.png')
    await screen.findByRole('img', { name: 'b.png' })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(thumbnails()).toBe(2)

    pasteImage('e.png', 'f.png')
    await screen.findByRole('img', { name: 'e.png' })
    expect(thumbnails()).toBe(3)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the first 1 were attached',
    )
  })

  it('ignores a drop during an upload and says it is attaching', async () => {
    state.hold = true
    mount()
    pasteImage('first.png')
    expect(screen.getByText('Attaching…')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Attach a screenshot' }),
    ).toHaveAttribute('aria-busy', 'true')

    dropImage('second.png')
    expect(fetch).toHaveBeenCalledTimes(1)

    state.release()
    await screen.findByRole('img', { name: 'first.png' })
    expect(screen.queryByText('Attaching…')).toBeNull()
    expect(thumbnails()).toBe(1)
  })

  it('leaves a drag of plain text to the field', () => {
    mount()
    const form = field().closest('form')!
    const text = { dataTransfer: { types: ['text/plain'] } }
    fireEvent.dragEnter(form, text)
    expect(fireEvent.dragOver(form, text)).toBe(true) // not default-prevented
    expect(form).not.toHaveAttribute('data-drop')
  })

  it('keeps the drop highlight while a file drag crosses the form’s children', () => {
    mount()
    const form = field().closest('form')!
    const files = { dataTransfer: { types: ['Files'] } }
    fireEvent.dragEnter(form, files)
    expect(fireEvent.dragOver(form, files)).toBe(false) // drop accepted
    fireEvent.dragEnter(field(), files)
    fireEvent.dragLeave(form, files)
    expect(form).toHaveAttribute('data-drop')
    fireEvent.dragLeave(field(), files)
    expect(form).not.toHaveAttribute('data-drop')
  })
})
