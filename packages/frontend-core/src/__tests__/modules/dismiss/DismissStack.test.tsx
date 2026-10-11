import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
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
  useDismissable(onDismiss, enabled === undefined ? undefined : { enabled })
  return (
    <div data-testid={`layer-${name}`}>
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
})
