import { act, render } from '@testing-library/react'
import { useReducer } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The router's live location. A real `navigate()` updates this synchronously,
// well before the resolved route match (and therefore `useSearch()`) catches up.
const live = { pathname: '/app/lims', search: {} as Record<string, unknown> }

// The pathological case this hook has to survive: the `useSearch()` snapshot
// lags a navigation the hook itself issued. Observed on a production build --
// the snapshot still read `{}` for 52 consecutive renders (#152).
const staleSnapshot: Record<string, unknown> = {}

let forceRender: (() => void) | undefined

const navigate = vi.fn((opts: { search: Record<string, unknown> }) => {
  live.search = opts.search
  // A navigation re-renders the subtree. Capped so a regression fails the
  // assertion below instead of hanging the suite.
  if (navigate.mock.calls.length < 30) forceRender?.()
})

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => navigate),
  useRouter: vi.fn(() => ({ state: { location: live } })),
  useSearch: vi.fn(() => staleSnapshot),
}))

const { useUrlSyncedState } =
  await import('~/modules/appCatalog/hooks/useUrlSyncedState')

let setSlug: (value: string) => void

function Probe() {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  forceRender = tick
  // Inline `encode`, as every caller writes it: a new function identity on
  // every render, so the sync effect re-runs on every render.
  const [, set] = useUrlSyncedState<string>({
    key: 'qj',
    defaultValue: '',
    encode: (value) => value || undefined,
  })
  setSlug = set
  return null
}

describe('useUrlSyncedState', () => {
  beforeEach(() => {
    navigate.mockClear()
    live.search = {}
  })

  it('writes a state change to the URL exactly once', () => {
    render(<Probe />)
    navigate.mockClear()

    act(() => setSlug('prodlims.rm-support-review'))

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(live.search.qj).toBe('prodlims.rm-support-review')
  })
})
