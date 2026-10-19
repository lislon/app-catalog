import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useEffect, useRef, useState } from 'react'
import {
  DismissStackProvider,
  useDismissable,
} from '~/modules/dismiss/DismissStack'

/**
 * The contract every overlay in the app now depends on, so it is worth pinning
 * precisely. Each case here corresponds to a way the old hand-rolled Escape
 * handling got it wrong.
 */

function Layer({
  name,
  onDismiss,
  enabled,
  children,
}: {
  name: string
  onDismiss: () => void
  enabled?: boolean
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismissable(
    ref,
    onDismiss,
    enabled === undefined ? undefined : { enabled },
  )
  return (
    <div ref={ref} data-testid={`layer-${name}`}>
      {name}
      {children}
    </div>
  )
}

const esc = () => userEvent.keyboard('{Escape}')

describe('the dismiss stack', () => {
  it('gives Escape to the layer registered last', async () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <>
        <Layer name="outer" onDismiss={outer} />
        <Layer name="inner" onDismiss={inner} />
      </>,
    )

    await esc()

    // The whole point: the thing opened last is the thing Escape takes away.
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('dismisses one layer per keypress, never two at once', async () => {
    // The reported bug: one Escape closed the dialog AND the card under it,
    // landing the user on the home page instead of back on the table.
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <>
        <Layer name="outer" onDismiss={outer} />
        <Layer name="inner" onDismiss={inner} />
      </>,
    )

    await esc()
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('falls back to the layer below once the top one unmounts', async () => {
    function Host() {
      const [innerOpen, setInnerOpen] = useState(true)
      return (
        <>
          <Layer name="outer" onDismiss={outer} />
          {innerOpen && (
            <Layer name="inner" onDismiss={() => setInnerOpen(false)} />
          )}
        </>
      )
    }
    const outer = vi.fn()
    render(<Host />)

    await esc()
    expect(screen.queryByTestId('layer-inner')).not.toBeInTheDocument()
    expect(outer).not.toHaveBeenCalled()

    // Escape again, and the layer underneath gets it — "previous", one step at
    // a time, which is what makes nesting work without anyone coordinating.
    await esc()
    expect(outer).toHaveBeenCalledTimes(1)
  })

  it('skips a disabled layer and asks the one beneath it', async () => {
    const outer = vi.fn()
    const closed = vi.fn()
    render(
      <>
        <Layer name="outer" onDismiss={outer} />
        <Layer name="closed" onDismiss={closed} enabled={false} />
      </>,
    )

    await esc()

    // A registered-but-closed popover must not swallow Escape. Staying
    // registered while disabled is what keeps stack order stable across a
    // toggle, so this case has to work.
    expect(closed).not.toHaveBeenCalled()
    expect(outer).toHaveBeenCalledTimes(1)
  })

  it('does not move a layer to the top just because it re-rendered', async () => {
    // The subtle one. If the hook re-registered whenever the callback identity
    // changed, the last component to RE-RENDER would win Escape instead of the
    // last one to OPEN — so an unrelated state change elsewhere would silently
    // redirect Escape.
    const outer = vi.fn()
    const inner = vi.fn()
    function Host() {
      const [n, setN] = useState(0)
      return (
        <>
          {/* A fresh closure every render, on the BOTTOM layer. */}
          <Layer name="outer" onDismiss={() => outer(n)} />
          <Layer name="inner" onDismiss={() => inner(n)} />
          <button type="button" onClick={() => setN((v) => v + 1)}>
            bump
          </button>
        </>
      )
    }
    render(<Host />)

    await userEvent.click(screen.getByRole('button', { name: 'bump' }))
    await esc()

    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
    // And the refreshed closure is the one that ran, not the stale one from
    // the first render.
    expect(inner).toHaveBeenCalledWith(1)
  })

  it('leaves Escape alone when a closer handler already claimed it', async () => {
    // An input that uses Escape for itself — cancelling an edit — is more
    // specific than any layer containing it, so the stack honours
    // preventDefault instead of overriding it.
    const layer = vi.fn()
    render(
      <Layer name="outer" onDismiss={layer}>
        <input
          aria-label="field"
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.preventDefault()
          }}
        />
      </Layer>,
    )

    await userEvent.click(screen.getByLabelText('field'))
    await esc()

    expect(layer).not.toHaveBeenCalled()
  })

  it('does nothing when no layer is registered', async () => {
    // Escape has to stay available to whatever else wants it — the search
    // results list clears the query on Escape when no overlay is open.
    const onKeyDown = vi.fn()
    render(<div onKeyDown={onKeyDown}>no layers</div>)

    await esc()

    expect(onKeyDown).not.toHaveBeenCalled() // nothing focused inside
  })

  it('works without a provider, and scopes to one when given', async () => {
    // The hook deliberately works unwrapped: a hook that silently did nothing
    // outside a provider is the same class of bug this module deletes.
    const bare = vi.fn()
    const { unmount } = render(<Layer name="bare" onDismiss={bare} />)
    await esc()
    expect(bare).toHaveBeenCalledTimes(1)
    unmount()

    const scoped = vi.fn()
    render(
      <DismissStackProvider>
        <Layer name="scoped" onDismiss={scoped} />
      </DismissStackProvider>,
    )
    await esc()
    expect(scoped).toHaveBeenCalledTimes(1)
  })

  it('removes its key listener once the last layer unmounts', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const onDismiss = vi.fn()

    const { unmount } = render(<Layer name="only" onDismiss={onDismiss} />)
    // Bubble phase, deliberately: a capture listener runs before every
    // component handler, which would stop a field from keeping Escape for
    // itself.
    expect(add).toHaveBeenCalledWith('keydown', expect.any(Function))

    unmount()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))

    // And really gone: an app with nothing open has no global key handler.
    await esc()
    expect(onDismiss).not.toHaveBeenCalled()

    add.mockRestore()
    remove.mockRestore()
  })

  it('gives Escape to a nested layer that opens later, not its container', async () => {
    // The regression this ordering exists for. React runs a CHILD's effects
    // before its parent's, so an overlay nested inside another registers
    // FIRST — and with registration-order LIFO the container looked like the
    // newer layer. Pressing Escape in the screenshot viewer therefore closed
    // the card underneath it and left the catalog index.
    const closeCard = vi.fn()
    function Host() {
      const [viewerOpen, setViewerOpen] = useState(false)
      return (
        <Layer name="card" onDismiss={closeCard}>
          {/* Mounted from the start and merely disabled, exactly as the
              screenshot dialog is, so it registers before its container. */}
          <Layer
            name="viewer"
            onDismiss={() => setViewerOpen(false)}
            enabled={viewerOpen}
          />
          <button type="button" onClick={() => setViewerOpen(true)}>
            open viewer
          </button>
        </Layer>
      )
    }
    render(<Host />)

    await userEvent.click(screen.getByRole('button', { name: 'open viewer' }))
    await esc()

    // The viewer closed; the card is still there.
    expect(closeCard).not.toHaveBeenCalled()

    // And now the card gets it.
    await esc()
    expect(closeCard).toHaveBeenCalledTimes(1)
  })

  it('ranks by position on screen, not by when a layer mounted', async () => {
    // The cold-deep-link shape. The dialog's route resolves first; the card
    // it sits over waits for the catalog and mounts LATER, while still being
    // rendered EARLIER in the document. Ranking by mount or activation time
    // made the card "newer", so Escape closed it first.
    const closeCard = vi.fn()
    const closeDialog = vi.fn()
    function Host() {
      const [catalogLoaded, setCatalogLoaded] = useState(false)
      return (
        <>
          {catalogLoaded && <Layer name="card" onDismiss={closeCard} />}
          <Layer name="dialog" onDismiss={closeDialog} />
          <button type="button" onClick={() => setCatalogLoaded(true)}>
            catalog arrives
          </button>
        </>
      )
    }
    render(<Host />)
    await userEvent.click(
      screen.getByRole('button', { name: 'catalog arrives' }),
    )

    await esc()

    expect(closeDialog).toHaveBeenCalledTimes(1)
    expect(closeCard).not.toHaveBeenCalled()
  })

  it('hands focus to the layer beneath when the top one closes', async () => {
    // Otherwise the caret falls to <body> and the next Tab walks whatever is
    // behind every overlay.
    function FocusableLayer({
      name,
      onDismiss,
    }: {
      name: string
      onDismiss: () => void
    }) {
      const ref = useRef<HTMLDivElement>(null)
      useDismissable(ref, onDismiss)
      return <div ref={ref} tabIndex={-1} data-testid={`layer-${name}`} />
    }
    function Host() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <FocusableLayer name="card" onDismiss={() => {}} />
          {open && (
            <FocusableLayer name="dialog" onDismiss={() => setOpen(false)} />
          )}
        </>
      )
    }
    render(<Host />)
    screen.getByTestId('layer-dialog').focus()

    await esc()
    // The handback is queued after the unmount, so let it run.
    await new Promise((r) => setTimeout(r, 0))

    expect(document.activeElement).toBe(screen.getByTestId('layer-card'))
  })

  /** A layer that takes the caret on mount, as the detail card does. */
  function GrabbingLayer({
    name,
    onDismiss,
    children,
  }: {
    name: string
    onDismiss: () => void
    children?: React.ReactNode
  }) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => ref.current?.focus(), [])
    useDismissable(ref, onDismiss)
    return (
      <div ref={ref} tabIndex={-1} data-testid={`layer-${name}`}>
        {children}
      </div>
    )
  }

  it('gives the caret back to the field that opened the last layer, where it was', async () => {
    // Enter on a search result opens the card; Escape has to land the reader
    // back in the query, caret and all, so a wrong pick is one keystroke to fix.
    function Host() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <input
            aria-label="search"
            onKeyDown={(e) => {
              if (e.key === 'Enter') setOpen(true)
            }}
          />
          {open && (
            <GrabbingLayer name="card" onDismiss={() => setOpen(false)} />
          )}
        </>
      )
    }
    render(<Host />)
    const input = screen.getByLabelText<HTMLInputElement>('search')

    await userEvent.type(input, 'Master Control{ArrowLeft}{Enter}')
    expect(screen.getByTestId('layer-card')).toHaveFocus()

    await esc()
    await new Promise((r) => setTimeout(r, 0))

    expect(input).toHaveFocus()
    expect([input.selectionStart, input.selectionEnd]).toEqual([13, 13])
  })

  it('does not hand the caret to an opener still covered by a layer', async () => {
    // A dialog opened from inside the card returns to its button in the card;
    // only the card closing reaches the field behind it.
    function Host() {
      const [card, setCard] = useState(false)
      const [dialog, setDialog] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setCard(true)}>
            open card
          </button>
          {card && (
            <GrabbingLayer name="card" onDismiss={() => setCard(false)}>
              <button type="button" onClick={() => setDialog(true)}>
                open dialog
              </button>
            </GrabbingLayer>
          )}
          {dialog && (
            <GrabbingLayer name="dialog" onDismiss={() => setDialog(false)} />
          )}
        </>
      )
    }
    render(<Host />)
    const tick = () => new Promise((r) => setTimeout(r, 0))

    await userEvent.click(screen.getByRole('button', { name: 'open card' }))
    await userEvent.click(screen.getByRole('button', { name: 'open dialog' }))
    await esc()
    await tick()
    expect(screen.getByRole('button', { name: 'open dialog' })).toHaveFocus()

    await esc()
    await tick()
    expect(screen.getByRole('button', { name: 'open card' })).toHaveFocus()
  })
})
