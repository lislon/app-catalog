import { describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
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
})
