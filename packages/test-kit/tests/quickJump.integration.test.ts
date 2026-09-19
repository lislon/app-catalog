import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given, magazine } from '@igstack/app-catalog-test-kit'

// Quick Jump (#143): one `[ destination | id | Jump ]` control on the app's
// header, next to the button that opens its home page.
describe('Quick Jump', () => {
  it('turns a typed id into a working link', async () => {
    const { ui } = await given(magazine.full())
    await ui.catalog.openApp('TaskFlow')

    // The first jump is the destination until the user picks another.
    const field = screen.getByLabelText('Task Id')
    expect(screen.getByText('Open task')).toBeInTheDocument()

    // Jump is dormant until the field has a value, and pressing it then says
    // "type here" rather than doing nothing. The same sentence is on screen for
    // anyone who only hovers -- CSS decides when, so the test only checks it is
    // rendered and names the identifier the field is asking for.
    const jump = screen.getByTitle('Enter a Task Id first')
    expect(screen.getByText('Type a Task Id here first')).toBeInTheDocument()
    fireEvent.click(jump)
    expect(document.activeElement).toBe(field)

    fireEvent.change(field, { target: { value: '  T-42 ' } })

    // Value trimmed, encoded exactly once.
    expect(
      screen.getByTitle('Open task → https://taskflow.example.com/task/T-42'),
    ).toHaveAttribute('href', 'https://taskflow.example.com/task/T-42')
  })

  it('puts the chosen destination in the url and reads it back', async () => {
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/app/taskflow?qj=task-history',
    })
    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))

    // A shared `?qj=` link opens on that destination, not the first one.
    expect(screen.getByText('Task history')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Task Id'), {
      target: { value: 'T-42' },
    })
    expect(
      screen.getByTitle(
        'Task history → https://taskflow.example.com/task/T-42/history',
      ),
    ).toBeInTheDocument()

    // Picking another destination rewrites the param, keeps the typed value.
    // Keyboard, not pointer: radix opens on pointerdown, which jsdom has no
    // real implementation of.
    fireEvent.keyDown(screen.getByTitle(/choose a destination/), {
      key: 'Enter',
    })
    const item = await screen.findByRole('menuitemradio', { name: 'Open task' })
    fireEvent.keyDown(item, { key: 'Enter' })

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ qj: 'open-task' }),
    )
    expect(screen.getByLabelText('Task Id')).toHaveValue('T-42')
  })

  it('drops a ?qj= that names no jump of the open app', async () => {
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/app/taskflow?qj=not-a-jump-here',
    })
    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))

    // Falling back to the first jump while the url still claimed another one
    // would make the url lie.
    await waitFor(() =>
      expect(router.state.location.search).not.toMatchObject({
        qj: 'not-a-jump-here',
      }),
    )
    expect(screen.getByText('Open task')).toBeInTheDocument()
  })
})
