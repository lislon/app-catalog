import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// "Your apps" reads click history from IndexedDB; irrelevant here and absent in jsdom.
vi.mock('~/modules/appCatalog/hooks/useAppClickHistory', () => ({
  useAppClickHistory: vi.fn(() => ({
    recordClick: vi.fn(),
    getTopApps: vi.fn(async () => []),
  })),
}))

const { AppCatalogGrid } =
  await import('~/modules/appCatalog/ui/catalog/AppCatalogGrid')

const apps = [
  { id: 'a', slug: 'alpha-one', displayName: 'Alpha One', type: 'application' },
  { id: 'b', slug: 'alpha-two', displayName: 'Alpha Two', type: 'application' },
  { id: 'c', slug: 'zeta', displayName: 'Zeta', type: 'application' },
] as Resource[]

function renderGrid(searchValue: string, detailOpen = false) {
  const onAppClick = vi.fn()
  render(
    <AppCatalogGrid
      apps={apps}
      searchValue={searchValue}
      onSearchChange={vi.fn()}
      onAppClick={onAppClick}
      onSubClick={vi.fn()}
      onLaunch={vi.fn()}
      detailOpen={detailOpen}
    />,
  )
  return onAppClick
}

// The result the first Enter opens is the one the list shows first — whatever
// the ranking put there — so read it off the DOM rather than the fixture order.
const nthResultName = (n: number) =>
  screen
    .getAllByRole('option')
    [n]!.getAttribute('title')!
    .replace(/^View /, '')

describe('AppCatalogGrid — Enter on a fresh query', () => {
  it('opens the first result when nothing has been focused yet', () => {
    const onAppClick = renderGrid('alpha')

    fireEvent.keyDown(document, { key: 'Enter' })

    expect(onAppClick).toHaveBeenCalledTimes(1)
    expect(onAppClick.mock.calls[0]![0].displayName).toBe(nthResultName(0))
  })

  it('shows the first result as focused so the user sees what Enter will open', () => {
    renderGrid('alpha')

    expect(screen.getAllByRole('option')[0]).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('still lets ↓ pick the second result', () => {
    const onAppClick = renderGrid('alpha')

    fireEvent.keyDown(document, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'Enter' })

    expect(onAppClick).toHaveBeenCalledTimes(1)
    expect(onAppClick.mock.calls[0]![0].displayName).toBe(nthResultName(1))
  })

  it('does nothing when the query has no results', () => {
    const onAppClick = renderGrid('nothing-matches-this')

    fireEvent.keyDown(document, { key: 'Enter' })

    expect(onAppClick).not.toHaveBeenCalled()
  })

  it('leaves the keyboard to the detail overlay while one is open', () => {
    const onAppClick = renderGrid('alpha', true)

    fireEvent.keyDown(document, { key: 'Enter' })

    expect(onAppClick).not.toHaveBeenCalled()
  })
})
