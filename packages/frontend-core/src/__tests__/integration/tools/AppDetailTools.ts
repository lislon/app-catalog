import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export interface AppVisibleData {
  title: string
  description: string | null
  url: string | null
  tags: string[]
  screenshots: { count: number }
  deprecation: { type: string; comment: string } | null
}

export class AppDetailTools {
  private user = userEvent.setup()

  /**
   * Scrape all visible data from the app detail panel into a structured object.
   */
  getVisibleData(): AppVisibleData {
    const panel = this.getPanel()

    // Title: the large text in the header area
    const titleEl = panel.querySelector('.text-2xl')
    const title = titleEl?.textContent.trim() ?? ''

    // Description
    const descHeading = this.findHeading(panel, 'Description')
    const description = descHeading
      ? this.getNextSiblingText(descHeading)
      : null

    // URL
    const urlLink = panel.querySelector('a[href][target="_blank"]')
    const url = urlLink?.getAttribute('href') ?? null

    // Tags
    const tagsHeading = this.findHeading(panel, 'Tags')
    const tags: string[] = []
    if (tagsHeading) {
      const container = tagsHeading.nextElementSibling
      if (container) {
        container
          .querySelectorAll('[class*="badge"], [data-slot="badge"]')
          .forEach((badge) => {
            const text = badge.textContent.trim()
            if (text) tags.push(text)
          })
      }
    }

    // Screenshots
    const screenshotHeading = this.findHeading(panel, 'Screenshots')
    let screenshotCount = 0
    if (screenshotHeading) {
      const match = screenshotHeading.textContent.match(/\((\d+)\)/)
      screenshotCount = match?.[1] ? parseInt(match[1], 10) : 0
    }

    // Deprecation
    let deprecation: AppVisibleData['deprecation'] = null
    const deprecationEl = panel.querySelector(
      '[class*="border-destructive"], [class*="border-yellow"]',
    )
    if (deprecationEl) {
      const typeEl = deprecationEl.querySelector('h3')
      const commentEl = deprecationEl.querySelector('p')
      deprecation = {
        type: typeEl?.textContent.toLowerCase().includes('discouraged')
          ? 'discouraged'
          : 'deprecated',
        comment: commentEl?.textContent.trim() ?? '',
      }
    }

    return {
      title,
      description,
      url,
      tags,
      screenshots: { count: screenshotCount },
      deprecation,
    }
  }

  /**
   * Get the sub-resources section data from the detail panel.
   * Returns null if no sub-resources section is visible.
   */
  getSubResources(): {
    total: number
    visible: number
    names: string[]
  } | null {
    const panel = this.getPanel()
    const heading = Array.from(panel.querySelectorAll('div')).find((el) =>
      el.textContent.match(/Sub-Resources \(\d+ of \d+\)/),
    )
    if (!heading) return null

    const match = heading.textContent.match(/Sub-Resources \((\d+) of (\d+)\)/)
    const visible = match?.[1] ? parseInt(match[1], 10) : 0
    const total = match?.[2] ? parseInt(match[2], 10) : 0

    const names: string[] = []
    const rows = panel.querySelectorAll('table tbody tr')
    rows.forEach((row) => {
      const nameCell = row.querySelector('td .font-medium')
      if (nameCell?.textContent) {
        names.push(nameCell.textContent.trim())
      }
    })

    return { total, visible, names }
  }

  screenshots = {
    /**
     * Click the screenshot preview to open the gallery modal.
     */
    open: async (): Promise<void> => {
      const panel = this.getPanel()
      const screenshotArea = panel.querySelector('.cursor-pointer')
      if (!screenshotArea) {
        throw new Error('No clickable screenshot found in detail panel')
      }
      await this.user.click(screenshotArea)
    },
  }

  private getPanel(): HTMLElement {
    const closeButton = screen.queryByLabelText('Close details panel')
    if (!closeButton) {
      throw new Error('App detail panel is not open')
    }
    // The panel is the closest scrollable container
    const panel = closeButton.closest('[class*="overflow-y-auto"]')
    if (!panel) {
      throw new Error('Could not find detail panel container')
    }
    return panel as HTMLElement
  }

  private findHeading(
    container: HTMLElement,
    text: string,
  ): HTMLElement | null {
    const headings = container.querySelectorAll('h3')
    for (const h of headings) {
      if (h.textContent.includes(text)) return h as HTMLElement
    }
    return null
  }

  private getNextSiblingText(heading: HTMLElement): string | null {
    const sibling = heading.nextElementSibling
    return sibling?.textContent.trim() ?? null
  }
}
