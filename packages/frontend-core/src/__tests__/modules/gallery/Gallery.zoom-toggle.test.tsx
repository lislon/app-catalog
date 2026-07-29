import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { Gallery } from '~/modules/gallery/Gallery'
import type { GalleryImage } from '~/modules/gallery/Gallery'

const images: GalleryImage[] = [
  { url: '/api/screenshots/img-1', alt: 'Screenshot 1' },
  { url: '/api/screenshots/img-2', alt: 'Screenshot 2' },
]

// Issue #14 — clicking the fullscreen image should exit fullscreen,
// making zoom-in / zoom-out a reversible click toggle.
describe('Gallery — click image to exit fullscreen', () => {
  it('exits fullscreen when the fullscreen image is clicked', async () => {
    render(<Gallery images={images} />)

    // Enter fullscreen by clicking the active slide image
    const activeImg = screen.getByAltText('Screenshot 1')
    await act(async () => {
      fireEvent.click(activeImg)
    })

    // Fullscreen overlay should now be visible
    const dialog = screen.getByRole('dialog', { name: /fullscreen view/i })
    expect(dialog).toBeInTheDocument()

    // Click the image inside the fullscreen overlay — should exit fullscreen
    const fullscreenImg = screen.getByAltText('Screenshot 1')
    await act(async () => {
      fireEvent.click(fullscreenImg)
    })

    // Fullscreen overlay should be gone (back to the carousel)
    expect(
      screen.queryByRole('dialog', { name: /fullscreen view/i }),
    ).not.toBeInTheDocument()
  })

  it('exposes the fullscreen image as an accessible exit control', async () => {
    render(<Gallery images={images} />)

    const activeImg = screen.getByAltText('Screenshot 1')
    await act(async () => {
      fireEvent.click(activeImg)
    })

    // The fullscreen image should itself be operable as an exit affordance
    const imageControl = screen.getByRole('button', { name: /zoom out/i })
    expect(imageControl).toBeInTheDocument()
  })
})
