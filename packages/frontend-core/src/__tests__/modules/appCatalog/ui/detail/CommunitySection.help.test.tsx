import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import type { AcPlugin } from '~/modules/extensions'
import { ExtensionsContext } from '~/modules/extensions'
import { CommunitySection } from '~/modules/appCatalog/ui/detail/CommunitySection'
import { useDismissable } from '~/modules/dismiss/DismissStack'

// Stub the query layer so the component mounts.
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { items: [], openCount: 0 } })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}))
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

/** Stands in for the card: a dismiss layer around the section. */
function Card({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  useDismissable(ref, onClose)
  return <div ref={ref}>{children}</div>
}

const onCardClose = vi.fn()
function mount(plugins: AcPlugin[] | undefined) {
  onCardClose.mockReset()
  return render(
    <ExtensionsContext value={plugins}>
      <Card onClose={onCardClose}>
        <CommunitySection appSlug="test-app" appName="Test App" />
      </Card>
    </ExtensionsContext>,
  )
}
const helpButton = () =>
  screen.getByRole('button', { name: 'How comments work' })
const DEFAULT_NOTE =
  'Every note is reviewed. Facts that check out update the card and are marked Used as source.'

describe('CommunitySection — How comments work', () => {
  it('toggles the popover with aria-expanded', () => {
    mount(undefined)
    const button = helpButton()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const popover = document.getElementById(
      button.getAttribute('aria-controls')!,
    )!
    expect(popover).not.toBeVisible()

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(popover).toBeVisible()
    expect(popover).toHaveTextContent('How comments work')
    expect(popover).toHaveTextContent(
      'Paste a link — a wiki page, a doc or a ticket that explains something about this app.',
    )
    expect(popover).toHaveTextContent(
      'Fix something — "Access is approved by your team lead, not IT."',
    )
    expect(popover).toHaveTextContent(
      'Ask a question — "Can contractors get access?"',
    )
    expect(popover).toHaveTextContent(
      'Attach a screenshot — paste it, drop it or use the paperclip.',
    )

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(popover).not.toBeVisible()
  })

  it('closes on Esc, returns focus to the button, and keeps the card open', () => {
    mount(undefined)
    fireEvent.click(helpButton())
    // From anywhere in the card, an empty input included.
    const field = screen.getByRole('textbox', {
      name: 'Know more about Test App?',
    })
    field.focus()
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(helpButton()).toHaveAttribute('aria-expanded', 'false')
    expect(helpButton()).toHaveFocus()
    expect(onCardClose).not.toHaveBeenCalled()

    // Closed, it leaves Esc to the card.
    fireEvent.keyDown(helpButton(), { key: 'Escape' })
    expect(onCardClose).toHaveBeenCalledTimes(1)
  })

  it('closes on a click outside it', () => {
    mount(undefined)
    fireEvent.click(helpButton())
    fireEvent.pointerDown(document.body)
    expect(helpButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays open on a click inside it', () => {
    mount(undefined)
    fireEvent.click(helpButton())
    fireEvent.pointerDown(screen.getByText(DEFAULT_NOTE))
    expect(helpButton()).toHaveAttribute('aria-expanded', 'true')
  })

  it('says what happens to a note by default', () => {
    mount(undefined)
    fireEvent.click(helpButton())
    expect(screen.getByText(DEFAULT_NOTE)).toBeVisible()
  })

  it('renders a plugin note instead of the default', () => {
    const plugin: AcPlugin = {
      name: 'test-note',
      slots: {
        resourceDetailFeedbackNote: ({ appSlug, appName }) => (
          <>
            Custom note for {appName} ({appSlug})
          </>
        ),
      },
    }
    mount([plugin])
    fireEvent.click(helpButton())
    expect(
      screen.getByText(/Custom note for Test App \(test-app\)/),
    ).toBeVisible()
    expect(screen.queryByText(DEFAULT_NOTE)).not.toBeInTheDocument()
  })

  it('has no note line under the input', () => {
    mount(undefined)
    const form = screen
      .getByRole('textbox', { name: 'Know more about Test App?' })
      .closest('form')!
    expect(form).not.toHaveTextContent(/reviewed|maintainer/)
  })

  it('passes appSlug and appName to the plugin', () => {
    let receivedProps: { appSlug: string; appName: string } | null = null
    const plugin: AcPlugin = {
      name: 'props-check',
      slots: {
        resourceDetailFeedbackNote: (props) => {
          receivedProps = props
          return <>Received</>
        },
      },
    }
    mount([plugin])
    expect(receivedProps).toEqual({
      appSlug: 'test-app',
      appName: 'Test App',
    })
  })
})
