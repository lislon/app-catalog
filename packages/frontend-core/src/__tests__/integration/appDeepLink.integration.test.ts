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

  it('keeps the search text after auto-navigating to a single match, without leaking ?q into the URL (#10, #27)', async () => {
    // A search that narrows the catalog to exactly one app auto-opens that
    // app's detail page. The filters provider is mounted per-route and remounts
    // on navigation, so component-local search state would be wiped. #10
    // originally worked around this by persisting `q` in the URL; #27 removes
    // `q` from the URL and instead backs the search value with sessionStorage -
    // so the text survives the remount WITHOUT polluting the shared link.
    //
    // We seed the search via sessionStorage (a returning user who typed a query
    // before this render) rather than driving keystrokes: the jsdom
    // `userEvent.type` + `useDeferredValue` combination drops characters
    // non-deterministically, which is orthogonal to what this test guards. The
    // seeded value exercises the same remount-survival path.
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/',
      seedSearch: 'jira',
    })

    // Auto-navigates to the single match...
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/jira')
    })

    // ...but the URL is CLEAN - no `?q=` leaked into the shareable link (#27).
    expect((router.state.location.search as { q?: string }).q).toBeUndefined()
    expect(router.state.location.href).toBe('/app/jira')
    // ...and the search text is still in the input (preserved via sessionStorage),
    // so the #10 guarantee (search not lost on auto-navigate) holds.
    expect(ui.catalog.getSearchInput().value).toBe('jira')
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
