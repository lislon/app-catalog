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
            approvalMethodId: approvalMethod.slug,
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
})
