import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import type { AppForCatalog } from '@igstack/app-catalog-backend-core'
import { AppDetailModal } from '~/modules/appCatalog/ui/components/AppDetailModal'
import { AppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import type { AppCatalogContextIface } from '~/modules/appCatalog/context/AppCatalogContext'

// Task 3.3 — integration test for full Escape dismissal chain
// Requirements: 6.7
// Chain: Fullscreen_View → Gallery_Dialog → App_Card
// Each Escape press dismisses only the innermost active layer.

const minimalContext: AppCatalogContextIface = {
  apps: [],
  isLoadingApps: false,
  tagsDefinitions: [],
  approvalMethods: [],
}

function makeApp(): AppForCatalog {
  return {
    id: 'app-1',
    slug: 'test-app',
    displayName: 'Test App',
    screenshotIds: ['screenshot-1', 'screenshot-2'],
  }
}

function pressEscape() {
  fireEvent.keyDown(document, {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  })
}

describe('Escape key — layered dismissal chain (integration)', () => {
  it('Escape dismisses layers one at a time: Fullscreen → Gallery → App Card', async () => {
    const onClose = vi.fn()
    const app = makeApp()

    render(
      <AppCatalogContext value={minimalContext}>
        <AppDetailModal app={app} isOpen={true} onClose={onClose} />
      </AppCatalogContext>,
    )

    // App card is open — modal content should be visible
    expect(screen.getByText('Test App')).toBeInTheDocument()

    // Step 1: Open the gallery by clicking a thumbnail
    const thumbnail = screen.getAllByRole('button', {
      name: /screenshot 1/i,
    })[0]
    await act(async () => {
      fireEvent.click(thumbnail!)
    })

    // Gallery dialog should now be open (Radix renders into a portal)
    await waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
    })

    // Step 2: Enter fullscreen by clicking the first active gallery image
    // Gallery images have alt "Test App screenshot" (without index number)
    const galleryImgs = document.querySelectorAll(
      '[role="dialog"] img[alt="Test App screenshot"]',
    )
    expect(galleryImgs.length).toBeGreaterThan(0)
    await act(async () => {
      fireEvent.click(galleryImgs[0]!)
    })

    // Fullscreen overlay should be visible
    await waitFor(() => {
      expect(
        document.querySelector('[aria-label="Fullscreen view"]'),
      ).toBeInTheDocument()
    })

    // --- First Escape: exits fullscreen, gallery stays open, app card stays open ---
    await act(async () => {
      pressEscape()
    })

    await waitFor(() => {
      expect(
        document.querySelector('[aria-label="Fullscreen view"]'),
      ).not.toBeInTheDocument()
    })
    // Gallery dialog still present
    expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
    // App card still open (onClose not called)
    expect(onClose).not.toHaveBeenCalled()

    // --- Second Escape: closes gallery dialog, app card stays open ---
    await act(async () => {
      pressEscape()
    })

    await waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument()
    })
    // App card still open (onClose not called yet)
    expect(onClose).not.toHaveBeenCalled()

    // --- Third Escape: closes app card ---
    await act(async () => {
      pressEscape()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
