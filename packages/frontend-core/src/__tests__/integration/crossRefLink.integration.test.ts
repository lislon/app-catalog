import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'

// #25: when an app description references another catalog app via a relative
// markdown link `[Name](/app/<slug>)`, it must navigate WITHIN the catalog
// (TanStack Router, same tab) rather than opening a new browser tab. External
// links stay `target=_blank`; links to unknown slugs render as plain text so
// there are no dead internal links.
describe('Cross-reference links between app entries (#25)', () => {
  const withCrossRefApp = magazine.full(({ backendCfg }) => {
    backendCfg.withApp({
      slug: 'portals-hub',
      displayName: 'Portals Hub',
      description:
        'See the [Jira](/app/jira) entry and the external [docs](https://example.com/docs). Also [Ghost](/app/no-such-app) which does not exist.',
    })
  })

  it('navigates in-app (same tab, no new tab) when clicking an internal /app/<slug> link', async () => {
    const { ui, router } = await given(withCrossRefApp, {
      initialRoute: '/app/portals-hub',
    })
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })

    const jiraLink = screen.getByRole('link', { name: 'Jira' })
    // Internal link must NOT open a new tab.
    expect(jiraLink).not.toHaveAttribute('target', '_blank')
    // It points at the router path (rendered as an href).
    expect(jiraLink).toHaveAttribute('href', '/app/jira')

    const user = userEvent.setup()
    await user.click(jiraLink)

    // In-app navigation: the router path changes and Jira's detail opens,
    // without a full page reload / new tab.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/jira')
    })
    await waitFor(() => {
      expect(ui.app.getOpenTitle()).toContain('Jira')
    })
  })

  it('sets aria-current="page" on an internal link that points at the open app', async () => {
    const { ui } = await given(
      magazine.full(({ backendCfg }) => {
        backendCfg.withApp({
          slug: 'self-ref',
          displayName: 'Self Ref',
          description: 'This links to [itself](/app/self-ref) recursively.',
        })
      }),
      { initialRoute: '/app/self-ref' },
    )
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    const selfLink = screen.getByRole('link', { name: 'itself' })
    expect(selfLink).toHaveAttribute('aria-current', 'page')
  })

  it('renders a link to a non-existent slug as plain text (no dead link)', async () => {
    const { ui } = await given(withCrossRefApp, {
      initialRoute: '/app/portals-hub',
    })
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    // "Ghost" text is present (as plain text merged into the paragraph)…
    expect(screen.getAllByText(/Ghost.*does not exist/).length).toBeGreaterThan(
      0,
    )
    // …but it is NOT a link (no dead internal link).
    expect(screen.queryByRole('link', { name: 'Ghost' })).toBeNull()
  })

  it('keeps external links opening in a new tab', async () => {
    const { ui } = await given(withCrossRefApp, {
      initialRoute: '/app/portals-hub',
    })
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    const docsLink = screen.getByRole('link', { name: 'docs' })
    expect(docsLink).toHaveAttribute('target', '_blank')
    expect(docsLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(docsLink).toHaveAttribute('href', 'https://example.com/docs')
  })
})
