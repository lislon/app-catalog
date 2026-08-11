import { describe, expect, it } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
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

    await ui.catalog.openApp('Jira')
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
          config: { url: 'https://helpdesk.example.com' },
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
          appUrl: 'https://example.natera.com/app',
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
    expect(btn!.getAttribute('href')).toBe('https://example.natera.com/app')
    expect(btn!.getAttribute('target')).toBe('_blank')
    // The URL is shown in the button (stripped of protocol).
    expect(btn!.textContent).toContain('example.natera.com/app')

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
    expect(tableData.map((r) => r.name)).toContain('Jira')
    expect(tableData.map((r) => r.name)).toContain('Slack')
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
    await ui.catalog.search('jira')
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
            slug: `biomarkers-${i}`,
            displayName: `Natera Biomarkers ${i}`,
          })
        }
      }),
    )
    await ui.catalog.search('biomarkers')
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
            slug: `biomarkers-${i}`,
            displayName: `Natera Biomarkers ${i}`,
          })
        }
      }),
    )
    await ui.catalog.search('biomarkers')
    await waitFor(() => {
      expect(ui.catalog.getSubResourceRows()).not.toBeNull()
    })
    await ui.catalog.expandSubResources()
    const subRows = ui.catalog.getSubResourceRows()
    expect(subRows!.visible).toBe(7)
    expect(subRows!.hasExpandRow).toBe(false)
  })

  it('clicking subresource row shows its detail with two-step access', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const parentMethod = backendCfg.withApprovalMethod({
          type: 'service',
          displayName: 'IT Help Desk',
          config: { url: 'https://helpdesk.example.com' },
        })
        const subMethod = backendCfg.withApprovalMethod({
          type: 'custom',
          displayName: 'Account Owner',
        })
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
          accessRequest: {
            approvalMethodSlug: parentMethod.slug,
            comments: 'Request AWS IAM access via IT Help Desk',
          },
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          slug: 'biomarkers-prod',
          displayName: 'Natera Biomarkers Prod',
          accessRequest: {
            approvalMethodSlug: subMethod.slug,
            comments: 'Contact account owner for account-level permissions',
          },
        })
      }),
    )
    await ui.catalog.search('biomarkers')
    await waitFor(() => {
      expect(ui.catalog.getSubResourceRows()).not.toBeNull()
    })
    await ui.catalog.clickSubResource('Natera Biomarkers Prod')
    await waitFor(() => {
      expect(ui.app.getSubResourceDetail()).not.toBeNull()
    })
    const detail = ui.app.getSubResourceDetail()
    expect(detail).not.toBeNull()
    expect(detail!.subResourceName).toBe('Natera Biomarkers Prod')
    expect(detail!.hasStep1).toBe(true)
    expect(detail!.hasStep2).toBe(true)
    expect(detail!.backButtonLabel).toBe('Back to AWS Console')
  })

  it('back button from subresource detail returns to parent view', async () => {
    const { ui } = await given(
      magazine.custom(({ backendCfg }) => {
        const method = backendCfg.withApprovalMethod({
          type: 'service',
          displayName: 'IT Help Desk',
          config: { url: 'https://helpdesk.example.com' },
        })
        const app = backendCfg.withApp({
          slug: 'aws-console',
          displayName: 'AWS Console',
          accessRequest: { approvalMethodSlug: method.slug },
        })
        backendCfg.withSubResource({
          appSlug: app.slug,
          slug: 'biomarkers-prod',
          displayName: 'Natera Biomarkers Prod',
        })
      }),
    )
    await ui.catalog.search('biomarkers')
    await waitFor(() => {
      expect(ui.catalog.getSubResourceRows()).not.toBeNull()
    })
    await ui.catalog.clickSubResource('Natera Biomarkers Prod')
    await waitFor(() => {
      expect(ui.app.getSubResourceDetail()).not.toBeNull()
    })
    await ui.app.clickBackToParent()
    // After going back, the sub detail should be gone and parent detail shown
    expect(ui.app.getSubResourceDetail()).toBeNull()
    expect(ui.catalog.isDetailPanelOpen()).toBe(true)
  })
})
