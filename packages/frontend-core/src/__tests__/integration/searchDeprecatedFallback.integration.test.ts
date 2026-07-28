import { describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// #11: when a search returns 0 non-deprecated results, fall back to including
// deprecated apps — show them, surface a notice, and auto-enable the
// "Show Deprecated Apps" toggle. `magazine.full()` includes a deprecated app
// "Old Tool" (slug old-tool) that is the only match for "old tool".
describe('Search fallback to deprecated apps (#11)', () => {
  it('shows deprecated matches + notice + enables the toggle when 0 active results', async () => {
    // Seed the query via the URL (`q`) to avoid the jsdom useDeferredValue +
    // userEvent typing race. "old tool" matches ONLY the deprecated "Old Tool".
    const { ui } = await given(magazine.full(), {
      initialRoute: '/?q=old%20tool',
    })

    // The fallback surfaces the deprecated match, shows the notice, and the
    // "Show Deprecated Apps" toggle is auto-enabled.
    await waitFor(() => {
      expect(ui.catalog.hasDeprecatedFallbackNotice()).toBe(true)
    })
    expect(ui.catalog.getTableData().map((r) => r.name)).toContain('Old Tool')
    expect(ui.catalog.isShowDeprecatedChecked()).toBe(true)
  })

  it('does not force deprecated results when the query has an active match', async () => {
    const { ui } = await given(magazine.full(), { initialRoute: '/?q=Jira' })

    await waitFor(() => {
      const names = ui.catalog.getTableData().map((r) => r.name)
      expect(names).toContain('Jira')
    })
    // Active match exists → no fallback, no notice, toggle stays off.
    expect(ui.catalog.hasDeprecatedFallbackNotice()).toBe(false)
    expect(ui.catalog.isShowDeprecatedChecked()).toBe(false)
  })

  it('keeps the normal empty state when nothing matches at all', async () => {
    const { ui } = await given(magazine.full(), {
      initialRoute: '/?q=zzz-nothing-matches-zzz',
    })

    await waitFor(() => {
      expect(ui.catalog.isEmptyStateVisible()).toBe(true)
    })
    expect(ui.catalog.hasDeprecatedFallbackNotice()).toBe(false)
  })
})
