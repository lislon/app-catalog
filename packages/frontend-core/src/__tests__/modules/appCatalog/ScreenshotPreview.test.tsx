import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import type { AppForCatalog } from '@igstack/app-catalog-backend-core'
import { AppDetailModal } from '~/modules/appCatalog/ui/components/AppDetailModal'
import { AppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import type { AppCatalogContextIface } from '~/modules/appCatalog/context/AppCatalogContext'

// Minimal context value — ScreenshotPreview doesn't use context directly,
// but AccessSection (sibling in AppDetailModal) does.
const minimalContext: AppCatalogContextIface = {
  apps: [],
  isLoadingApps: false,
  tagsDefinitions: [],
  approvalMethods: [],
}

function renderWithContext(app: AppForCatalog) {
  return render(
    <AppCatalogContext value={minimalContext}>
      <AppDetailModal app={app} isOpen={true} onClose={() => {}} />
    </AppCatalogContext>,
  )
}

function makeApp(screenshotIds: string[]): AppForCatalog {
  return {
    id: 'app-1',
    slug: 'test-app',
    displayName: 'Test App',
    screenshotIds,
  }
}

// Task 2.2 — unit test for thumbnail size parameter
// Requirements: 1.1, 1.3
describe('ScreenshotPreview thumbnail URLs', () => {
  it('appends ?size=600 to each thumbnail src', () => {
    const ids = ['abc123', 'def456', 'ghi789']
    renderWithContext(makeApp(ids))

    const imgs = screen.getAllByRole('img', { name: /screenshot/i })
    for (const [i, id] of ids.entries()) {
      expect(imgs[i]).toHaveAttribute('src', `/api/screenshots/${id}?size=600`)
    }
  })

  it('renders one thumbnail per screenshot ID', () => {
    const ids = ['id-1', 'id-2', 'id-3']
    renderWithContext(makeApp(ids))

    const imgs = screen.getAllByRole('img', { name: /screenshot/i })
    expect(imgs).toHaveLength(ids.length)
  })

  it('shows placeholder when screenshotIds is empty', () => {
    renderWithContext(makeApp([]))
    expect(screen.getByText(/no screenshots available/i)).toBeInTheDocument()
  })
})
