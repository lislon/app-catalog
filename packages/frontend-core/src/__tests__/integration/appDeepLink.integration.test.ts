import { describe, expect, it } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

describe('App deep-link routing', () => {
  it('opens the app detail when navigating directly to /app/<slug>', async () => {
    const { ui } = await given(magazine.full(), { initialRoute: '/app/jira' })
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
  })

  it('navigates to /app/<slug> when selecting an app, and pushes history', async () => {
    const { ui, router } = await given(magazine.full(), { initialRoute: '/' })
    await ui.catalog.openApp('Jira')
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/jira')
    })
    // push (not replace): catalog '/' is still in history, Back returns to it
    expect(router.history.canGoBack()).toBe(true)
  })

  it('renders the catalog with nothing open for an unknown slug', async () => {
    const { ui } = await given(magazine.full(), {
      initialRoute: '/app/does-not-exist',
    })
    await waitFor(() => {
      expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
    })
    expect(ui.catalog.isDetailPanelOpen()).toBe(false)
  })

  it('returns to / when the detail panel is closed', async () => {
    const { ui, router } = await given(magazine.full(), { initialRoute: '/' })
    await ui.catalog.openApp('Jira')
    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(false)
    })
    expect(router.state.location.pathname).toBe('/')
  })

  it('ignores legacy ?app= query param (no detail opens)', async () => {
    const { ui } = await given(magazine.full(), { initialRoute: '/?app=jira' })
    await waitFor(() => {
      expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
    })
    expect(ui.catalog.isDetailPanelOpen()).toBe(false)
  })

  it('keeps the search text and focus after auto-navigating to a single match (#10)', async () => {
    // A search query that narrows to exactly one app auto-opens its detail
    // page. Before the fix the search value lived in component-local state and
    // was NOT in the URL, so the per-route remount wiped the input (and focus)
    // on navigation. Now `q` is URL-synced and carried through the navigation.
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/?q=jira',
    })

    // Auto-navigates to the single match, preserving the `q` query param.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/jira')
    })
    expect(router.state.location.search).toMatchObject({ q: 'jira' })

    // The search input still holds the query (bug: it reset to '') and keeps focus.
    const input = ui.catalog.getSearchInput()
    expect(input.value).toBe('jira')
    expect(document.activeElement).toBe(input)
  })
})
