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

  it('a single search match stays in the launcher morph — no auto-jump to /app (#38)', async () => {
    // Regression (#38): a search narrowing to exactly one app used to auto-open
    // that app's detail route, which — with the launcher — yanked the user out
    // of the search-morph into the old grid+panel (reported: typing "biom"
    // jumped straight to an app-detail page). The morph now shows the single
    // match as a selectable row; the user opts in (click / ↵) to open it.
    //
    // Seed via sessionStorage (returning user who typed before this render):
    // jsdom userEvent.type + useDeferredValue drops characters, orthogonal here.
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/',
      seedSearch: 'jira',
    })

    // Stays on the launcher home — NO auto-navigation to the detail route.
    await waitFor(() => {
      expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
    })
    expect(router.state.location.pathname).toBe('/')
    expect(ui.catalog.getTableData().map((r) => r.name)).toContain('Jira')
    // Search text preserved (sessionStorage-backed), no ?q leak.
    expect(ui.catalog.getSearchInput().value).toBe('jira')
    expect((router.state.location.search as { q?: string }).q).toBeUndefined()

    // Opting in (click) opens the detail.
    await ui.catalog.openApp('Jira')
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/jira')
    })
  })

  it('strips a legacy ?q= from the URL on the app detail route (#27)', async () => {
    // Old shared links may still carry `?q=` (e.g. /app/jira?q=jira). `q` is
    // still declared in the route search schema (so it validates), but the
    // route's `stripSearchParams(['q'])` middleware rewrites the URL to a clean
    // /app/jira on load. We no longer read `q` from the URL, so a bare deep-link
    // doesn't repopulate the input from the query string.
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/app/jira?q=jira',
    })

    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    expect(router.state.location.pathname).toBe('/app/jira')
    expect(router.state.location.href).toBe('/app/jira')
    expect((router.state.location.search as { q?: string }).q).toBeUndefined()
  })

  it('redirects /app/<alias> to the canonical /app/<slug> (replace, no back entry)', async () => {
    // #22: when an app is renamed, its old slug is preserved in aliases[].
    // Hitting the old URL should land the user on the canonical app, not a
    // blank catalog, and must use replace (so Back doesn't bounce to the alias).
    const { ui, router } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'cluster-operations',
          displayName: 'Cluster Operations',
          aliases: ['prod-ops-tool'],
        })
      }),
      { initialRoute: '/app/prod-ops-tool' },
    )

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/cluster-operations')
    })
    expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    // replace, not push: the alias URL must not be a Back target
    expect(router.history.canGoBack()).toBe(false)
  })

  it('restores the search input from sessionStorage on the app detail route (#10 read path, #27)', async () => {
    // The #10 guarantee - landing on /app/<slug> repopulates the search input -
    // now sources the query from sessionStorage instead of `?q=` (#27). Seed the
    // store as a returning user would have (typed a search, then navigated), and
    // assert the detail route restores it with no `q` in the URL.
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/app/jira',
      seedSearch: 'jira',
    })

    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    expect(ui.catalog.getSearchInput().value).toBe('jira')
    expect((router.state.location.search as { q?: string }).q).toBeUndefined()
  })
})
