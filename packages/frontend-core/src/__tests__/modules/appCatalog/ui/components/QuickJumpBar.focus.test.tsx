import type { Resource } from '@igstack/app-catalog-backend-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// The chosen destination lives in the url; the router is not what this test is
// about, so the hook is reduced to local state.
vi.mock('~/modules/appCatalog/hooks/useUrlSyncedState', () => ({
  useUrlSyncedState: vi.fn(() => ['', vi.fn()]),
}))

const { QuickJumpBar } =
  await import('~/modules/appCatalog/ui/components/QuickJumpBar')

const app = (quickJumps: unknown[]) =>
  ({
    id: 'tracker',
    slug: 'tracker',
    displayName: 'Tracker',
    appUrl: 'https://tracker.example.com',
    quickJumps,
  }) as Resource

// Opening a card is a deliberate act, so the one thing in it you can act on
// takes the caret — you type the id without reaching for the mouse.
describe('QuickJumpBar — focus on open', () => {
  it('focuses the identifier field', () => {
    render(
      <QuickJumpBar
        app={app([
          {
            identity: 'case id',
            title: 'Tracker — view case',
            url: '{{baseHost}}/case/{{value}}',
          },
        ])}
      />,
    )

    expect(screen.getByLabelText('case id')).toHaveFocus()
  })

  it('leaves focus alone on a coarse pointer', () => {
    // Focusing there pops the virtual keyboard over half the panel.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    render(
      <QuickJumpBar
        app={app([
          {
            identity: 'case id',
            title: 'Tracker — view case',
            url: '{{baseHost}}/case/{{value}}',
          },
        ])}
      />,
    )

    expect(screen.getByLabelText('case id')).not.toHaveFocus()
    vi.unstubAllGlobals()
  })
})
