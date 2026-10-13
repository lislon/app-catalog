import type { Resource } from '@igstack/app-catalog-backend-core'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

vi.mock('~/modules/appCatalog/ui/detail/AppDetails', () => ({
  AppDetails: () => <p>body</p>,
}))
vi.mock('~/modules/appCatalog/ui/components/SubResourceDetailPanel', () => ({
  SubResourceDetailPanel: () => null,
}))
vi.mock('~/modules/appCatalog/context/AppCatalogContext', () => ({
  useAppCatalogContext: vi.fn(() => ({ approvalMethods: [], resources: [] })),
}))

const { AppDetailPanel } =
  await import('~/modules/appCatalog/ui/catalog/AppDetailPanel')

const app = { slug: 'tracker', displayName: 'Tracker' } as Resource

describe('AppDetailPanel — widen button', () => {
  // jsdom has no layout, so the measured width is checked on the live site;
  // here only the toggle and its cap.
  it('toggles the card between its capped width and the full width', async () => {
    const user = userEvent.setup()
    render(<AppDetailPanel app={app} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).not.toHaveClass('max-w-none')

    await user.click(screen.getByRole('button', { name: 'Widen card' }))
    expect(dialog).toHaveClass('max-w-none')

    await user.click(screen.getByRole('button', { name: 'Restore width' }))
    expect(dialog).not.toHaveClass('max-w-none')
    expect(screen.getByRole('button', { name: 'Widen card' })).toBeVisible()
  })

  it('works from the keyboard and leaves Escape closing the card', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AppDetailPanel app={app} onClose={onClose} />)

    screen.getByRole('button', { name: 'Widen card' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toHaveClass('max-w-none')

    fireEvent.keyDown(screen.getByRole('button', { name: 'Restore width' }), {
      key: 'Escape',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
