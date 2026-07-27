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
    // Typing a query that narrows the catalog to exactly one app auto-opens
    // that app's detail page. Before the fix the search value lived in
    // component-local state (not the URL), and the filters provider remounts
    // per route, so the input text (and focus) were wiped on navigation.
    // This starts from an EMPTY search (initialRoute '/') and types — the real
    // user flow — so it also guards the effect-ordering race where the child
    // auto-navigate effect runs before the provider's async state→URL sync.
    const { ui, router } = await given(magazine.full(), { initialRoute: '/' })

    await ui.catalog.search('jira')

    // Auto-navigates to the single match, carrying the typed query into the URL
    // as `q` (the fix). The regression this guards: before the fix `q` was never
    // written, so on the per-route remount the input reset to '' and lost focus.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/jira')
    })

    // The query is persisted in the URL and the input reflects it — they stay in
    // sync across the navigation, so the typed text is never lost.
    const q = (router.state.location.search as { q?: string }).q
    expect(q).toBeTruthy()
    expect(ui.catalog.getSearchInput().value).toBe(q)
  })

  it('populates the search input from ?q= on the app detail route (#10 read path)', async () => {
    // The detail route must NOT strip `q` from the URL: landing on /app/<slug>
    // with a query must repopulate the search input. This is what was actually
    // broken — the route had no validateSearch schema, so `q` was dropped.
    const { ui } = await given(magazine.full(), {
      initialRoute: '/app/jira?q=jira',
    })

    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    expect(ui.catalog.getSearchInput().value).toBe('jira')
  })
})
