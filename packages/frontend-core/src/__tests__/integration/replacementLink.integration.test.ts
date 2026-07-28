import { describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// #12: a deprecated app's "View replacement" link must open the replacement
// app's detail — like typing its /app/<slug> URL — even when the replacement
// is not in the current filtered/search results. In magazine.full(),
// "Old Tool" is deprecated with replacementSlug 'new-tool' ("New Tool").
describe('Deprecated app "View replacement" link (#12)', () => {
  it('opens the replacement app even when it is filtered out of search results', async () => {
    // Deep-link straight onto the deprecated Old Tool with an active search of
    // "old tool" — which does NOT match "New Tool", so the replacement is
    // absent from the filtered list (the exact condition that broke the link).
    const { ui, router } = await given(magazine.full(), {
      initialRoute: '/app/old-tool?q=old%20tool',
    })

    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    expect(ui.app.getOpenTitle()).toContain('Old Tool')

    // Click "View replacement: New Tool".
    await ui.app.clickViewReplacement()

    // URL navigates to the replacement, and its detail panel actually renders
    // (before the fix the panel went blank because it resolved the open app
    // from the filtered list, which excluded New Tool).
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/new-tool')
    })
    await waitFor(() => {
      expect(ui.app.getOpenTitle()).toContain('New Tool')
    })
  })

  it('deep-links to an app that is filtered out by an active search', async () => {
    // Hard navigation: /app/<slug> should render the app regardless of a
    // non-matching active search (browser-URL-like behavior).
    const { ui } = await given(magazine.full(), {
      initialRoute: '/app/jira?q=zzz-no-match-zzz',
    })

    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    expect(ui.app.getOpenTitle()).toContain('Jira')
  })
})
