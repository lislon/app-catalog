import { describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given, magazine } from '@igstack/app-catalog-test-kit'

/**
 * `?deprecated=1` is the only way to see deprecated apps in the grid, and
 * until now nothing covered it — the existing deprecated tests all go through
 * SEARCH (#11's fallback notice), which reads the full resource set and never
 * consults this flag.
 *
 * The grid's app list is memoized on `[rootResources, showDeprecated]`, and
 * the third case below is the one that pins the second dependency. The first
 * two only prove the flag is read on load, which a memo with the wrong deps
 * still gets right — its initial value is correct, so nothing diverges until
 * the flag CHANGES within a session. Checked by dropping the dependency: the
 * first two cases still passed, the third fails.
 *
 * Note the value is `1`, not `true` — the flag decodes with `value === '1'`,
 * so `?deprecated=true` reads as false and silently shows nothing new.
 */
describe('deprecated apps in the grid (?deprecated=1)', () => {
  const catalog = magazine.custom(({ backendCfg }) => {
    backendCfg.withApp({ slug: 'active-tool', displayName: 'Active Tool' })
    backendCfg.withApp({
      slug: 'retired-tool',
      displayName: 'Retired Tool',
      // `deprecated` is a record, not a boolean -- a bare `true` is truthy at
      // runtime so the tests still passed, and only `tsc` caught it.
      deprecated: { comment: 'Replaced by Active Tool' },
    })
  })

  it('hides a deprecated app by default', async () => {
    const { ui } = await given(catalog, { initialRoute: '/' })

    await waitFor(() => {
      expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
    })
    const names = ui.catalog.getTableData().map((r) => r.name)
    expect(names.join(' ')).toContain('Active Tool')
    expect(names.join(' ')).not.toContain('Retired Tool')
  })

  it('shows it when the flag is on', async () => {
    const { ui } = await given(catalog, { initialRoute: '/?deprecated=1' })

    await waitFor(() => {
      expect(
        ui.catalog
          .getTableData()
          .map((r) => r.name)
          .join(' '),
      ).toContain('Retired Tool')
    })
    // The active one does not disappear when the deprecated ones join it.
    expect(
      ui.catalog
        .getTableData()
        .map((r) => r.name)
        .join(' '),
    ).toContain('Active Tool')
  })

  // KNOWN FAILURE, and a pre-existing one -- `it.fails` so the defect is
  // pinned rather than forgotten. When it is fixed this flips to failing,
  // which is the signal to change it back to `it`.
  //
  // `useUrlSyncedState` reads the URL exactly once, in a `useState` initializer,
  // and its effect only ever pushes state -> URL. Nothing adopts an external
  // URL change afterwards; the effect re-asserts the OLD state over it (see the
  // comment on its deps). So the flag is load-time only: Back/Forward cannot
  // restore it, and pasting `?deprecated=1` into an already-open tab does
  // nothing. Not caused by the memo -- verified by dropping the memo's
  // dependency, which leaves the two cases above passing and this one failing
  // either way.
  it.fails('reveals them when the flag is turned on mid-session', async () => {
    const { ui, router } = await given(catalog, { initialRoute: '/' })

    await waitFor(() => {
      expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
    })
    expect(
      ui.catalog
        .getTableData()
        .map((r) => r.name)
        .join(' '),
    ).not.toContain('Retired Tool')

    // The reducer form, because `deprecated` is not in this route's search
    // schema -- it survives only because the router is non-strict, which is
    // also why the initial-load cases above work at all.
    await router.navigate({
      to: '/',
      search: (prev) => ({ ...prev, deprecated: '1' }),
    })

    await waitFor(() => {
      expect(
        ui.catalog
          .getTableData()
          .map((r) => r.name)
          .join(' '),
      ).toContain('Retired Tool')
    })
  })
})
