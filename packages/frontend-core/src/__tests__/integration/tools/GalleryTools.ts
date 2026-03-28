import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export class GalleryTools {
  private user = userEvent.setup()

  async clickNext(): Promise<void> {
    const nextBtn = screen.getByRole('button', { name: /next/i })
    await this.user.click(nextBtn)
  }

  async clickPrev(): Promise<void> {
    const prevBtn = screen.getByRole('button', { name: /prev/i })
    await this.user.click(prevBtn)
  }

  isOpen(): boolean {
    return !!document.querySelector('[role="dialog"]')
  }
}
