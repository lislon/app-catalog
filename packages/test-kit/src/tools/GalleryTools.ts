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
    // Detect the SCREENSHOT gallery specifically — not just any [role="dialog"]
    // (the app detail card is also a dialog now, #38). The gallery is the only
    // dialog with next/prev navigation controls.
    return !!(
      screen.queryByRole('button', { name: /next/i }) &&
      screen.queryByRole('button', { name: /prev/i })
    )
  }
}
