import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { given } from './harness/given'
import { magazine } from './mock-backend/magazines'
import {
  makeConnectionResetError,
  makeHtmlResponseError,
} from './mock-network/errorFactories'
import { suppressConsole, suppressConsoleGlobal } from './tools/suppressConsole'

describe('App Catalog Integration', () => {
  // Background sync debug noise appears whenever cache is used with backend down
  suppressConsoleGlobal(/Background sync failed/)

  // Test 1: Full Navigation Flow (Magazine-based, high abstraction)
  it('navigate screenshots then escape back to list view', async () => {
    const { ui } = await given(magazine.full())

    await ui.catalog.openApp('TaskFlow')
    await ui.app.screenshots.open()

    await waitFor(() => {
      expect(ui.gallery.isOpen()).toBe(true)
    })

    await ui.gallery.clickNext()
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(ui.gallery.isOpen()).toBe(false)
    })

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(false)
    })
    expect(ui.catalog.getTableData().length).toBeGreaterThan(0)
  })

  // Test 2: Custom Configurer + Table Data + Admin User
  it('admin sees custom app with all details in table', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const approvalMethod = backendCfg.withApprovalMethod({
          type: 'service',
          displayName: 'Help Desk',
          config: { url: 'https://support.example.com' },
        })
        backendCfg.withApp({
          displayName: 'My Custom App',
          description: 'A test application',
          screenshotIds: ['screenshot-1'],
          accessRequest: {
            approvalMethodSlug: approvalMethod.slug,
            comments: 'Submit a ticket',
          },
        })
        backendCfg.withUser({ name: 'Boris', isAdmin: true })
      }),
    )

    const tableData = ui.catalog.getTableData()
    expect(tableData).toEqual([
      { name: 'My Custom App', description: 'A test application' },
    ])

    await ui.catalog.openApp('My Custom App')
    const appData = ui.app.getVisibleData()
    expect(appData.title).toBe('My Custom App')
    expect(appData.description).toBe('A test application')
  })

  // Access UX (#31): "no access required" must be stated, not implied by a
  // blank section. Previously a noAccessRequired/custom method rendered nothing.
  it('states "open to everyone" for a no-access-required app', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const method = backendCfg.withApprovalMethod({
          type: 'noAccessRequired',
          displayName: 'No Approval Needed',
          config: {},
        })
        backendCfg.withApp({
          displayName: 'Open App',
          description: 'Anyone can use it',
          accessRequest: { approvalMethodSlug: method.slug },
        })
      }),
    )

    await ui.catalog.openApp('Open App')
    const access = ui.app.getAccessText()
    expect(access).not.toBeNull()
    expect(access!.toLowerCase()).toContain('no request')
  })

  // Access UX (#31): an undocumented method must route the user to the owner,
  // never leave a blank/dead access section.
  it('offers a fallback when the access process is undocumented', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const method = backendCfg.withApprovalMethod({
          type: 'unknown',
          displayName: 'Unknown',
          config: {},
        })
        backendCfg.withApp({
          displayName: 'Mystery App',
          description: 'Access process not written down',
          accessRequest: { approvalMethodSlug: method.slug },
        })
      }),
    )

    await ui.catalog.openApp('Mystery App')
    const access = ui.app.getAccessText()
    expect(access).not.toBeNull()
    expect(access!.toLowerCase()).toContain('not')
  })

  // Access UX (#31): each row has a secondary "open in new tab" launch action
  // (the primary click opens detail). The launch link points at the app URL and
  // must not also open the detail panel.
  it('offers a secondary launch link on rows that has the app url', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        backendCfg.withApp({
          displayName: 'Launchable App',
          description: 'Has a url',
          appUrl: 'https://launch.example.com',
        })
        // Second app so the single-result auto-open doesn't fire.
        backendCfg.withApp({
          displayName: 'Other App',
          description: 'No url here',
        })
      }),
    )

    const link = ui.catalog.getLaunchLink('Launchable App')
    expect(link).not.toBeNull()
    expect(link!.getAttribute('href')).toBe('https://launch.example.com')
    expect(link!.getAttribute('target')).toBe('_blank')
    // The row without a URL has no launch link.
    expect(ui.catalog.getLaunchLink('Other App')).toBeNull()
    // Launch link is a secondary action — it does not open the detail panel.
    expect(ui.catalog.isDetailPanelOpen()).toBe(false)
  })

  // Detail card UX (#45): the detail panel shows a prominent primary "Open" button
  // with the destination URL visible alongside it.
  it('shows a prominent primary Open button with URL in the app detail card', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        backendCfg.withApp({
          displayName: 'Website App',
          description: 'Has a website',
          appUrl: 'https://tools.example.com/launch',
        })
        backendCfg.withApp({
          displayName: 'No URL App',
          description: 'No url',
        })
      }),
    )

    await ui.catalog.openApp('Website App')
    const btn = ui.app.getOpenButton()
    expect(btn).not.toBeNull()
    expect(btn!.getAttribute('href')).toBe('https://tools.example.com/launch')
    expect(btn!.getAttribute('target')).toBe('_blank')
    // The URL is shown in the button (stripped of protocol).
    expect(btn!.textContent).toContain('tools.example.com/launch')

    // An app without appUrl shows no Open button.
    await ui.catalog.openApp('No URL App')
    expect(ui.app.getOpenButton()).toBeNull()
  })

  // Test 5: Returning user — cached data + no onboarding + backend down
  it('returning user sees cached apps even when backend is unavailable', async () => {
    suppressConsole([/TRPC Error/, /Failed to fetch/])

    const { ui } = await given(
      magazine.fullReturningUser(({ networkCfg }) => {
        networkCfg.overrideConfig((catalog) => {
          catalog.replace(['appCatalog-query'], makeConnectionResetError())
        })
      }),
    )

    expect(ui.catalog.isOnboardingVisible()).toBe(false)

    const tableData = ui.catalog.getTableData()
    expect(tableData.length).toBe(5)
    expect(tableData.map((r) => r.name)).toContain('TaskFlow')
    expect(tableData.map((r) => r.name)).toContain('TeamChat')
  })

  // Test 3: Network Error — Connection Reset
  it('shows error when backend returns connection reset', async () => {
    suppressConsole([
      /TRPC Error/,
      /Failed to fetch/,
      /error boundary/,
      /Error in route match/,
    ])

    const { ui } = await given(
      magazine.single(({ networkCfg }) => {
        networkCfg.overrideConfig((catalog) => {
          catalog.replace(['appCatalog-query'], makeConnectionResetError())
        })
      }),
    )

    const error = ui.globalError()
    expect(error.message).toBeTruthy()
    expect(error.element).toBeInTheDocument()
  })

  // Test: Sub-resources visible in side panel
  it('shows sub-resources table in detail panel when app has sub-resources', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
          description: 'Cloud management console',
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          displayName: 'acct-prod',
          tier: 'prod',
          ownerPersonSlug: 'jsmith',
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          displayName: 'acct-dev',
          tier: 'dev',
          ownerPersonSlug: 'jdoe',
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          displayName: 'acct-staging',
          tier: 'staging',
        })
      }),
    )

    await ui.catalog.openApp('AWS Console')
    const subResources = ui.app.getSubResources()
    expect(subResources).not.toBeNull()
    expect(subResources!.total).toBe(3)
    expect(subResources!.visible).toBe(3)
    expect(subResources!.names).toContain('acct-prod')
    expect(subResources!.names).toContain('acct-dev')
    expect(subResources!.names).toContain('acct-staging')
  })

  it('surfaces the parent app when searching for a sub-resource name (#38)', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
          description: 'Cloud management console',
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          displayName: 'acct-payments-prod',
          tier: 'prod',
        })
        backendCfg.withApp({
          slug: 'unrelated',
          displayName: 'Unrelated Tool',
          description: 'Nothing to do with the query',
        })
      }),
    )

    // Query matches only a sub-resource name; the parent app must appear in the
    // launcher search-morph results (cross-sub-resource search preserved).
    await ui.catalog.search('acct-payments-prod')
    const names = ui.catalog.getTableData().map((r) => r.name)
    expect(names).toContain('AWS Console')
    expect(names).not.toContain('Unrelated Tool')
  })

  // Test 4: Malformed Response — HTML Instead of JSON
  it('shows error when backend returns HTML instead of JSON', async () => {
    suppressConsole([
      /TRPC Error/,
      /Failed to fetch/,
      /error boundary/,
      /Error in route match/,
    ])

    const { ui } = await given(
      magazine.single(({ networkCfg }) => {
        networkCfg.overrideConfig((catalog) => {
          catalog.replace(['appCatalog-query'], makeHtmlResponseError())
        })
      }),
    )

    const error = ui.globalError()
    expect(error.message).toBeTruthy()
    expect(error.element).toBeInTheDocument()
  })

  // Regression: stray "0" must not appear when search matches nothing (#30)
  it('does not render stray zero when search yields no results', async () => {
    const { ui } = await given(magazine.full())

    await ui.catalog.search('zzz-no-match-guaranteed')

    await waitFor(() => {
      expect(ui.catalog.isEmptyStateVisible()).toBe(true)
    })

    const table = document.querySelector('table')
    const tableText = table?.textContent ?? ''
    // A bare "0" from the numeric-&& leak would appear as a standalone text node
    expect(tableText.replace(/\s/g, '')).not.toMatch(/^0$/)
    expect(document.body.textContent).not.toMatch(
      /(?<![\d])0(?![\d]).*clear filters/i,
    )
  })

  it('highlights matched query text in search result app names (#57)', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        backendCfg.withApp({ displayName: 'Kubernetes Platform' })
        backendCfg.withApp({ displayName: 'Other Tool' })
      }),
    )

    await ui.catalog.search('kube')

    await waitFor(() => {
      const marks = document.querySelectorAll('mark')
      const markTexts = [...marks].map((m) => String(m.textContent))
      expect(markTexts.some((t) => t.toLowerCase().includes('kube'))).toBe(true)
    })
  })

  it('clear (×) button appears when search has text and clears on click (#54)', async () => {
    const { ui } = await given(magazine.full())

    // Before typing: no clear button
    expect(
      document.querySelector('[aria-label="Clear search"]'),
    ).not.toBeInTheDocument()

    // After typing: clear button appears
    await ui.catalog.search('taskflow')
    await waitFor(() => {
      expect(
        document.querySelector('[aria-label="Clear search"]'),
      ).toBeInTheDocument()
    })

    // Click × — input clears, button disappears
    fireEvent.click(document.querySelector('[aria-label="Clear search"]')!)
    await waitFor(() => {
      expect(ui.catalog.getSearchInput().value).toBe('')
      expect(
        document.querySelector('[aria-label="Clear search"]'),
      ).not.toBeInTheDocument()
    })
  })

  // Layout stability: typing must not swap the launcher shell for the grid.
  // Regression — the first keystroke used to unmount the centered launcher and
  // mount AppCatalogGrid instead (its own search bar, Show All / My Recent tabs,
  // category dropdown, deprecated checkbox, wide table), so the whole upper half
  // of the page jumped. The hero and the search input must be the very same DOM
  // nodes before and after typing, with no filter chrome in search mode.
  it('keeps the hero + search box mounted while typing, with no filter chrome', async () => {
    const { ui } = await given(magazine.full())

    const heroBefore = screen.getByText('What do you need to get into?')
    const inputBefore = ui.catalog.getSearchInput()

    await ui.catalog.search('taskflow')
    await waitFor(() => {
      expect(ui.catalog.getTableData().map((r) => r.name)).toContain('TaskFlow')
    })

    // Same nodes → nothing above the results was re-rendered from scratch.
    expect(screen.getByText('What do you need to get into?')).toBe(heroBefore)
    expect(ui.catalog.getSearchInput()).toBe(inputBefore)

    // No grid chrome while searching.
    expect(document.querySelector('table')).toBeNull()
    expect(
      screen.queryByRole('checkbox', { name: /Show Deprecated Apps/i }),
    ).toBeNull()
    expect(screen.queryByText(/My Recent/i)).toBeNull()
    expect(screen.queryByText(/Filter By Category/i)).toBeNull()

    // Clearing the search returns to the browse view in the same shell.
    fireEvent.click(document.querySelector('[aria-label="Clear search"]')!)
    await waitFor(() => {
      expect(screen.getByText(/Browse all/i)).toBeInTheDocument()
    })
    expect(screen.getByText('What do you need to get into?')).toBe(heroBefore)
    expect(ui.catalog.getSearchInput()).toBe(inputBefore)
  })

  it('shows expandable subresource rows under parent in search results', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
          description: 'Cloud management console',
        })
        for (let i = 1; i <= 7; i++) {
          backendCfg.withSubResource({
            appSlug: app.slug,
            slug: `acct-data-${i}`,
            displayName: `Data Account ${i}`,
          })
        }
      }),
    )
    await ui.catalog.search('Data Account')
    await waitFor(() => {
      const subRows = ui.catalog.getSubResourceRows()
      expect(subRows).not.toBeNull()
      expect(subRows!.visible).toBe(5)
      expect(subRows!.total).toBe(7)
      expect(subRows!.hasExpandRow).toBe(true)
    })
  })

  it('expand "...N more" row reveals all subresources', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
        })
        for (let i = 1; i <= 7; i++) {
          backendCfg.withSubResource({
            appSlug: app.slug,
            slug: `acct-data-${i}`,
            displayName: `Data Account ${i}`,
          })
        }
      }),
    )
    await ui.catalog.search('Data Account')
    await waitFor(() => {
      expect(ui.catalog.getSubResourceRows()).not.toBeNull()
    })
    await ui.catalog.expandSubResources()
    const subRows = ui.catalog.getSubResourceRows()
    expect(subRows!.visible).toBe(7)
    expect(subRows!.hasExpandRow).toBe(false)
  })

  it('clicking subresource row opens parent app detail', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const method = backendCfg.withApprovalMethod({
          type: 'service',
          displayName: 'Support Portal',
          config: { url: 'https://support.example.com' },
        })
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
          accessRequest: {
            approvalMethodSlug: method.slug,
            comments: 'Submit a support ticket to request access',
          },
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          slug: 'acct-data-prod',
          displayName: 'Data Account Prod',
        })
      }),
    )
    await ui.catalog.search('Data Account')
    await waitFor(() => {
      expect(ui.catalog.getSubResourceRows()).not.toBeNull()
    })
    await ui.catalog.clickSubResource('Data Account Prod')
    // Clicking a sub-resource opens the parent app detail, not the sub-detail.
    // The sub-resources section inside the panel is pre-filtered by the search query.
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    expect(ui.app.getOpenTitle()).toContain('AWS Console')
    // No sub-detail — the parent detail is shown directly
    expect(ui.app.getSubResourceDetail()).toBeNull()
  })

  it('back button from subresource detail returns to parent view', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const method = backendCfg.withApprovalMethod({
          type: 'service',
          displayName: 'Support Portal',
          config: { url: 'https://support.example.com' },
        })
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
          accessRequest: { approvalMethodSlug: method.slug },
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          slug: 'acct-data-prod',
          displayName: 'Data Account Prod',
        })
      }),
    )
    await ui.catalog.search('Data Account')
    await waitFor(() => {
      expect(ui.catalog.getSubResourceRows()).not.toBeNull()
    })
    // Clicking sub-resource row opens the parent, so the detail panel is open
    await ui.catalog.clickSubResource('Data Account Prod')
    await waitFor(() => {
      expect(ui.catalog.isDetailPanelOpen()).toBe(true)
    })
    // Parent detail is shown — no sub-detail, no back button needed
    expect(ui.app.getSubResourceDetail()).toBeNull()
    expect(ui.app.getOpenTitle()).toContain('AWS Console')
  })

  it('shows Step 1 / Step 2 badges for two-step access apps (#56)', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const method = backendCfg.withApprovalMethod({
          type: 'service',
          displayName: 'Natero Bot',
          config: { url: 'https://natero.example.com' },
        })
        backendCfg.withApp({
          displayName: 'Two-Step App',
          accessRequest: {
            approvalMethodSlug: method.slug,
            requestPrompt: 'Give me access to Two-Step App',
            postApprovalInstructions: 'Contact the owner to complete setup.',
          },
        })
        backendCfg.withApp({ displayName: 'Other App' })
      }),
    )
    await ui.catalog.openApp('Two-Step App')
    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    expect(
      screen.getByText('Contact the owner to complete setup.'),
    ).toBeInTheDocument()
  })

  it('hides Step labels for single-step apps (#56)', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const method = backendCfg.withApprovalMethod({
          type: 'service',
          displayName: 'Natero Bot',
          config: { url: 'https://natero.example.com' },
        })
        backendCfg.withApp({
          displayName: 'Single-Step App',
          accessRequest: {
            approvalMethodSlug: method.slug,
            requestPrompt: 'Give me access',
          },
        })
        backendCfg.withApp({ displayName: 'Other App' })
      }),
    )
    await ui.catalog.openApp('Single-Step App')
    await waitFor(() => expect(ui.catalog.isDetailPanelOpen()).toBe(true))
    expect(screen.queryByText('Step 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Step 2')).not.toBeInTheDocument()
  })
})
