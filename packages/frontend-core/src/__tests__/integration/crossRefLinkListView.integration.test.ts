import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// #25 regression: descriptions now carry markdown cross-reference links like
// `[Example Portal](/app/example-portal)`. The detail panel renders them
// as real links, but the COMPACT surfaces (grid list preview / table row) show
// `description` as plain text, so the raw markdown syntax leaked to users.
// In clamped previews we render the visible text only — no bracket/paren
// syntax, and no dead/interactive link that would break `line-clamp`.
describe('Cross-reference links do not leak raw markdown in the list view (#25)', () => {
  const withCrossRefApp = magazine.full(({ backendCfg }) => {
    backendCfg.withApp({
      slug: 'example-portals',
      displayName: 'Portals Hub',
      description:
        'See [Example Portal](/app/example-portal) and [Portal B](/app/portal-b).',
    })
  })

  it('shows link text (not raw markdown) in the list-view description cell', async () => {
    const { ui } = await given(withCrossRefApp)
    await waitFor(() => {
      expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
    })

    const row = ui.catalog.getTableData().find((r) => r.name === 'Portals Hub')
    expect(row).toBeDefined()

    // The clamped preview shows the visible text…
    expect(row!.description).toContain('Example Portal')
    expect(row!.description).toContain('Portal B')
    // …and NEVER leaks the raw markdown link syntax.
    expect(row!.description).not.toContain('](/app/')
    expect(row!.description).not.toContain('[Example Portal]')
  })

  it('does not render an interactive link inside the clamped list preview', async () => {
    await given(withCrossRefApp)
    await waitFor(() => {
      expect(screen.getByText(/See Example Portal and/)).toBeInTheDocument()
    })
    // A clamped preview must not carry a navigational link that could break the
    // clamp/layout — the interactive cross-links live in the detail panel.
    expect(screen.queryByRole('link', { name: 'Example Portal' })).toBeNull()
  })
})
