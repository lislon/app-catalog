import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// The dev-only skew warning fires when resources loaded but 0 are top-level
// (fingerprint of a frontend/backend-core version skew or stale service worker).
describe('empty-catalog skew warning (dev-only)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  const origDev = import.meta.env.DEV

  beforeEach(() => {
    // Force DEV so the guarded warning path runs under the test runner.
    ;(import.meta.env as { DEV: boolean }).DEV = true
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
    ;(import.meta.env as { DEV: boolean }).DEV = origDev
  })

  it('warns when resources load but none are top-level (skew fingerprint)', async () => {
    // Skew fixture: one resource, and it is a CHILD (parentSlug set) → rootResources === 0.
    const skew = magazine.custom(({ backendCfg }) => {
      backendCfg.withApp({
        slug: 'child-only',
        displayName: 'Child Only',
        parentSlug: 'ghost-parent',
      })
    })
    const { ui } = await given(skew)
    await waitFor(() => {
      expect(
        warnSpy.mock.calls.some((c) =>
          String(c[0]).includes('0 are top-level'),
        ),
      ).toBe(true)
    })
    // sanity: catalog rendered the empty state, not a crash
    expect(ui.catalog).toBeDefined()
  })

  it('does NOT warn for a normal populated catalog', async () => {
    const { ui } = await given(magazine.full())
    await waitFor(() => {
      expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
    })
    expect(
      warnSpy.mock.calls.some((c) => String(c[0]).includes('0 are top-level')),
    ).toBe(false)
  })
})
