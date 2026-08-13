import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// The backend owns the freshness semantic and serves
// { lastCheckedAt, lastContentChangeAt, isStale }. These tests only assert the
// frontend renders that semantic — no date math here.
const DAY = 24 * 60 * 60 * 1000
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

describe('App freshness line', () => {
  it('shows an "Updated" freshness line when the app has freshness', async () => {
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'fresh-app',
          displayName: 'Fresh App',
          freshness: {
            lastCheckedAt: iso(2 * DAY),
            lastContentChangeAt: null,
            isStale: false,
          },
        })
      }),
      { initialRoute: '/app/fresh-app' },
    )

    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.getByText(/Updated/i)).toBeInTheDocument()
    // fresh → no stale note
    expect(screen.queryByText(/may be out of date/i)).toBeNull()
  })

  it('appends "may be out of date" when the backend marks it stale', async () => {
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'stale-app',
          displayName: 'Stale App',
          freshness: {
            lastCheckedAt: iso(30 * DAY),
            lastContentChangeAt: null,
            isStale: true,
          },
        })
      }),
      { initialRoute: '/app/stale-app' },
    )

    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.getByText(/may be out of date/i)).toBeInTheDocument()
  })

  it('shows "Added" date before Sources when createdAt is present (#55)', async () => {
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'dated-app',
          displayName: 'Dated App',
          createdAt: iso(30 * DAY),
        })
      }),
      { initialRoute: '/app/dated-app' },
    )
    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.getByText(/Added/i)).toBeInTheDocument()
  })

  it('shows the last CONTENT change, not the last check', async () => {
    // The reported symptom: an app read 22h ago showed "Updated 22 hours ago"
    // while its data had not changed in months. "Updated" must mean changed.
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'checked-often-app',
          displayName: 'Checked Often App',
          freshness: {
            lastCheckedAt: iso(DAY / 24), // read an hour ago
            lastContentChangeAt: iso(120 * DAY), // unchanged for months
            isStale: false,
          },
        })
      }),
      { initialRoute: '/app/checked-often-app' },
    )

    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    const line = screen.getByText(/Updated/i)
    expect(line).toHaveTextContent(/months ago/i)
    expect(line).not.toHaveTextContent(/hour/i)
  })

  it('falls back to the last check for entries with no recorded change', async () => {
    // Rows scanned before lastContentChangeAt existed: better to show the check
    // date than to drop the line entirely.
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'unchanged-app',
          displayName: 'Unchanged App',
          freshness: {
            lastCheckedAt: iso(3 * DAY),
            lastContentChangeAt: null,
            isStale: false,
          },
        })
      }),
      { initialRoute: '/app/unchanged-app' },
    )

    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.getByText(/Updated/i)).toHaveTextContent(/3 days ago/i)
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
    expect(screen.queryByText(/Updated/i)).toBeNull()
  })
})
