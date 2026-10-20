import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given, magazine } from '@igstack/app-catalog-test-kit'

// The backend owns the freshness semantic and serves
// { lastCheckedAt, lastContentChangeAt, isStale }. These tests only assert the
// frontend renders that semantic — no date math here.
const DAY = 24 * 60 * 60 * 1000
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()

// The dates live on the card's Metadata tab, so every case opens it first —
// including the "no line" case. Asserting the absence from another tab would
// pass whether or not the line works, which is worse than having no test.
describe('App freshness line', () => {
  it('shows a "Last checked" line when the app has freshness', async () => {
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
    await ui.app.openTab('behind')
    expect(screen.getByText(/^Last checked/)).toBeInTheDocument()
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
    await ui.app.openTab('behind')
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
    await ui.app.openTab('behind')
    expect(screen.getByText(/Added/i)).toBeInTheDocument()
  })

  it('says when the sources were last checked, and keeps the last change in the title', async () => {
    // The line is labelled for what it reports: a source read an hour ago and
    // unchanged for months says "Last checked 1 hour ago", never "Updated".
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'checked-often-app',
          displayName: 'Checked Often App',
          createdAt: iso(200 * DAY),
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
    await ui.app.openTab('behind')
    const line = screen.getByText(/^Last checked/)
    expect(line).toHaveTextContent(
      /^Last checked .*hour.* · added .*months ago$/,
    )
    expect(line.getAttribute('title')).toMatch(/^Content last changed /)
    expect(screen.queryByText(/Updated/)).toBeNull()
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
    await ui.app.openTab('behind')
    expect(screen.queryByText(/Last checked/)).toBeNull()
  })
})
