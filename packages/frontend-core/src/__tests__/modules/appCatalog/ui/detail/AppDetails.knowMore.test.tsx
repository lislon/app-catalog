import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Same stubs as the escape test: AppDetails drags the whole panel data layer in
// and none of it decides where the input sits or what Esc does.
vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  useNavigate: vi.fn(() => vi.fn()),
  useRouter: vi.fn(() => ({
    state: { location: { pathname: '/', search: {} } },
  })),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}))
vi.mock('~/modules/appCatalog/context/AppCatalogContext', () => ({
  useAppCatalogContext: vi.fn(() => ({ approvalMethods: [], resources: [] })),
}))
vi.mock('~/modules/appCatalog/hooks/useAppClickHistory', () => ({
  useAppClickHistory: vi.fn(() => ({ recordClick: vi.fn() })),
}))
vi.mock('~/modules/appCatalog/hooks/useUpdateApp', () => ({
  useUpdateApp: vi.fn(() => ({ mutate: vi.fn() })),
}))
vi.mock('~/modules/appCatalog/ui/context/AppCatalogFiltersContext', () => ({
  useAppCatalogFilters: vi.fn(() => ({ selectedTags: [], toggleTag: vi.fn() })),
}))
vi.mock('~/modules/auth', () => ({ useUser: vi.fn(() => null) }))
vi.mock('~/modules/appCatalog/ui/detail/FeedbackSection', () => ({
  FeedbackSection: () => <div />,
}))

// KnowMoreInput is real — the Esc contract lives in it, so mocking it would
// test the mock. Only its data layer is stubbed.
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

const { AppDetails } = await import('~/modules/appCatalog/ui/detail/AppDetails')
const { useDismissable } = await import('~/modules/dismiss/DismissStack')

/** Stands in for the card: the layer AppDetails is rendered inside. */
function CardLayer({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismissable(ref, onClose)
  return (
    <div ref={ref} role="dialog" aria-label="card">
      {children}
    </div>
  )
}

const app = {
  id: 'example-app',
  slug: 'example-app',
  displayName: 'Example App',
  description: 'Does things.',
} as Resource

const input = () =>
  screen.getByRole('textbox', {
    name: 'Know something more about Example App?',
  })

describe('AppDetails — Know something more?', () => {
  it('sits at the foot of every tab', () => {
    render(<AppDetails app={app} />)
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab)
      const panel = screen.getByRole('tabpanel')
      expect(
        within(panel).getByRole('textbox', { name: /Know something more/ }),
      ).toBeInTheDocument()
    }
  })

  it('is gone from the band', () => {
    render(<AppDetails app={app} />)
    expect(
      screen.queryByRole('button', { name: /Suggest a change/ }),
    ).toBeNull()
  })

  it('Esc with a draft clears it and keeps the card open', () => {
    const onClose = vi.fn()
    render(
      <CardLayer onClose={onClose}>
        <AppDetails app={app} />
      </CardLayer>,
    )
    fireEvent.change(input(), { target: { value: 'draft' } })
    fireEvent.keyDown(input(), { key: 'Escape', code: 'Escape' })
    expect(input()).toHaveValue('')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Esc on an empty field still closes the card', () => {
    const onClose = vi.fn()
    render(
      <CardLayer onClose={onClose}>
        <AppDetails app={app} />
      </CardLayer>,
    )
    fireEvent.keyDown(input(), { key: 'Escape', code: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('A send from the Access tab creates feedback without changing the tab', () => {
    const appWithAccess = {
      ...app,
      approvalMethodSlug: 'ops-team',
    } as Resource
    render(<AppDetails app={appWithAccess} />)
    // Click Access tab
    const accessTab = screen.getByRole('tab', { name: /Access/i })
    fireEvent.click(accessTab)
    expect(accessTab).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel')
    // Type and send
    const field = within(panel).getByRole('textbox', {
      name: /Know something more/,
    })
    fireEvent.change(field, { target: { value: 'approval detail' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(state.sent).toEqual([
      { resourceSlug: 'example-app', body: 'approval detail' },
    ])
    // Still on Access tab
    expect(accessTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toBe(panel)
  })
})
