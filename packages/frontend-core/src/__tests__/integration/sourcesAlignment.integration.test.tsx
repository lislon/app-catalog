import { describe, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// #28: In the app-detail "Sources" numbered list, the item markers ("1.", "2.")
// are shrink-wrapped spans. In a proportional font the glyph "2" is wider than
// "1", so without equal-width digits the following text on row 2 starts a few
// pixels to the right of row 1 — the list stops looking left-aligned. The fix
// is `tabular-nums` on the marker span so every digit occupies the same width.
describe('Sources list marker alignment (#28)', () => {
  it('renders numbered source markers with tabular-nums so rows left-align', async () => {
    const { ui } = await given(
      magazine.full((ctx) => {
        ctx.backendCfg.withApp({
          slug: 'multi-source-app',
          displayName: 'Multi Source App',
          description: 'An app that cites several sources',
          sources: [
            'https://wiki.example.com/spaces/AAA/pages/1/First-Source',
            'https://wiki.example.com/spaces/BBB/pages/2/Second-Source',
          ],
        })
      }),
      { initialRoute: '/app/multi-source-app' },
    )

    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })

    // Locate the numbered markers in the "Sources" list.
    const markers = Array.from(document.querySelectorAll('li > span')).filter(
      (el) => /^\d+\.$/.test(el.textContent.trim()),
    )

    // Two sources → two numbered markers.
    expect(markers.length).toBe(2)

    // Each marker must use equal-width digits so "1." and "2." occupy the same
    // width and all rows share the same left edge.
    for (const marker of markers) {
      expect(marker.className).toContain('tabular-nums')
    }
  })
})
