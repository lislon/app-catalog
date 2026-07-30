import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// The backend owns the freshness semantic and serves { lastCheckedAt, isStale }.
// These tests only assert the frontend renders that semantic — no date math here.
const DAY = 24 * 60 * 60 * 1000
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

describe('App freshness line', () => {
  it('shows a muted "Last checked" line when the app has freshness', async () => {
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'fresh-app',
          displayName: 'Fresh App',
          freshness: { lastCheckedAt: iso(2 * DAY), isStale: false },
        })
      }),
      { initialRoute: '/app/fresh-app' },
    )

    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.getByText(/Last checked/i)).toBeInTheDocument()
    // fresh → no stale note
    expect(screen.queryByText(/may be out of date/i)).toBeNull()
  })

  it('appends "may be out of date" when the backend marks it stale', async () => {
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'stale-app',
          displayName: 'Stale App',
          freshness: { lastCheckedAt: iso(30 * DAY), isStale: true },
        })
      }),
      { initialRoute: '/app/stale-app' },
    )

    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.getByText(/may be out of date/i)).toBeInTheDocument()
  })

  it('shows no freshness line when the app was never scanned', async () => {
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'unscanned-app',
          displayName: 'Unscanned App',
          // no freshness field
        })
      }),
      { initialRoute: '/app/unscanned-app' },
    )

    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.queryByText(/Last checked/i)).toBeNull()
  })
})
