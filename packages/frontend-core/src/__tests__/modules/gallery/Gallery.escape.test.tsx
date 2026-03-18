import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Gallery } from '~/modules/gallery/Gallery'
import type { GalleryImage } from '~/modules/gallery/Gallery'

const images: Array<GalleryImage> = [
  { url: '/api/screenshots/img-1', alt: 'Screenshot 1' },
  { url: '/api/screenshots/img-2', alt: 'Screenshot 2' },
]

// Task 3.2 — unit test for Escape key layering
// Requirements: 6.3, 6.5, 6.7
describe('Gallery — Escape key in fullscreen', () => {
  it('exits fullscreen on Escape and does not show fullscreen overlay afterwards', async () => {
    render(<Gallery images={images} />)

    // Enter fullscreen by clicking the active slide image
    const activeImg = screen.getByAltText('Screenshot 1')
    await act(async () => {
      fireEvent.click(activeImg)
    })

    // Fullscreen overlay should now be visible
    expect(
      screen.getByRole('dialog', { name: /fullscreen view/i }),
    ).toBeInTheDocument()

    // Press Escape — should exit fullscreen
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape', bubbles: true })
    })

    // Fullscreen overlay should be gone
    expect(
      screen.queryByRole('dialog', { name: /fullscreen view/i }),
    ).not.toBeInTheDocument()
  })

  it('stops propagation of Escape when in fullscreen so outer dialogs are not closed', async () => {
    render(<Gallery images={images} />)

    // Enter fullscreen
    const activeImg = screen.getByAltText('Screenshot 1')
    await act(async () => {
      fireEvent.click(activeImg)
    })

    expect(
      screen.getByRole('dialog', { name: /fullscreen view/i }),
    ).toBeInTheDocument()

    // Attach a listener on the window to detect whether the event propagated
    const outerHandler = vi.fn()
    window.addEventListener('keydown', outerHandler, true)

    // Dispatch Escape on document — Gallery's capture listener should consume it
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    const stopPropSpy = vi.spyOn(escapeEvent, 'stopPropagation')

    await act(async () => {
      document.dispatchEvent(escapeEvent)
    })

    expect(stopPropSpy).toHaveBeenCalled()

    window.removeEventListener('keydown', outerHandler, true)
  })

  it('does not intercept Escape when not in fullscreen', async () => {
    render(<Gallery images={images} />)

    // No fullscreen — Escape should not be intercepted by Gallery
    const outerHandler = vi.fn()
    document.addEventListener('keydown', outerHandler)

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape', bubbles: true })
    })

    // The event should have reached the outer handler (not stopped)
    expect(outerHandler).toHaveBeenCalled()

    document.removeEventListener('keydown', outerHandler)
  })
})
