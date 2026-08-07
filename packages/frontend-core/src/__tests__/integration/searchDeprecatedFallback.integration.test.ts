import { describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// #11: when a search returns 0 non-deprecated results, fall back to showing
// deprecated matches and surface a notice. In the launcher search-morph (#38)
// there is no separate "Show Deprecated Apps" toggle (a grid-era control) —
// the morph searches the full set and only labels the deprecated-only case.
// `magazine.full()` includes a deprecated app "Old Tool" (slug old-tool) that
// is the only match for "old tool".
describe('Search fallback to deprecated apps (#11)', () => {
  it('shows deprecated matches + notice when 0 active results', async () => {
    // Seed the query via sessionStorage to avoid the jsdom useDeferredValue +
    // userEvent typing race (#27 removed `?q=` from the URL). "old tool" matches
    // ONLY the deprecated "Old Tool".
    const { ui } = await given(magazine.full(), {
      initialRoute: '/',
      seedSearch: 'old tool',
    })

    // The fallback surfaces the deprecated match and shows the notice.
    await waitFor(() => {
      expect(ui.catalog.hasDeprecatedFallbackNotice()).toBe(true)
    })
    expect(ui.catalog.getTableData().map((r) => r.name)).toContain('Old Tool')
  })

  it('does not show the fallback notice when the query has an active match', async () => {
    const { ui } = await given(magazine.full(), {
      initialRoute: '/',
      seedSearch: 'Jira',
    })

    await waitFor(() => {
      const names = ui.catalog.getTableData().map((r) => r.name)
      expect(names).toContain('Jira')
    })
    // Active match exists → no deprecated-fallback notice.
    expect(ui.catalog.hasDeprecatedFallbackNotice()).toBe(false)
  })

  it('keeps the normal empty state when nothing matches at all', async () => {
    const { ui } = await given(magazine.full(), {
      initialRoute: '/',
      seedSearch: 'zzz-nothing-matches-zzz',
    })

    await waitFor(() => {
      expect(ui.catalog.isEmptyStateVisible()).toBe(true)
    })
    expect(ui.catalog.hasDeprecatedFallbackNotice()).toBe(false)
  })
})
