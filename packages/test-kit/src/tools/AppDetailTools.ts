import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Tabs in the detail card. The ids are the card's public contract — they appear
 * in `?tab=` and in each tab's element id — so selecting by id rather than by
 * visible label keeps these tools working when a label changes. The access tab
 * names its route ("Access — Free") and the children tab is named by the parent
 * ("Accounts"), so neither label is a stable handle.
 */
export type AppDetailTabId =
  | 'overview'
  | 'access'
  | 'resources'
  | 'documentation'
  | 'notes'

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
   * Select a tab in the detail card.
   *
   * For tests that read the card through `screen` rather than through these
   * tools: the content they are looking for may be one tab over. The getters
   * below switch tabs for themselves.
   */
  async openTab(id: AppDetailTabId): Promise<void> {
    const tab = this.findTab(id)
    if (!tab) {
      throw new Error(
        `Tab "${id}" is not present in the open detail card. Present: [${this.presentTabs().join(', ')}]`,
      )
    }
    await this.user.click(tab)
  }

  /** Which tabs this entry actually has — `resources` only when it has any. */
  presentTabs(): AppDetailTabId[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>('[role="tab"][id^="detail-tab-"]'),
    ).map((el) => el.id.replace('detail-tab-', '') as AppDetailTabId)
  }

  private findTab(id: AppDetailTabId): HTMLElement | null {
    return document.getElementById(`detail-tab-${id}`)
  }

  /**
   * Make a tab's panel the rendered one, synchronously.
   *
   * The getters below are sync and existing callers depend on that, so this
   * uses `fireEvent` rather than `userEvent`. A no-op when the tab is already
   * selected, so repeated reads do not thrash the card.
   */
  private ensureTab(id: AppDetailTabId): void {
    const tab = this.findTab(id)
    if (!tab || tab.getAttribute('aria-selected') === 'true') return
    fireEvent.click(tab)
  }

  /**
   * Scrape all visible data from the app detail panel into a structured object.
   */
  getVisibleData(): AppVisibleData {
    // Description, tags and screenshots are Overview content; title, url and
    // the deprecation notice are in the band and visible from every tab.
    this.ensureTab('overview')
    const panel = this.getPanel()

    // Title: the name inside the door at the top of the card
    const titleEl = panel.querySelector('.app-door__title')
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
    /** Name of the row marked `aria-current` — the one the user asked for. */
    currentName: string | null
  } | null {
    this.ensureTab('resources')
    const panel = this.getPanel()
    // By test id, not by the heading's text: the label comes from the parent's
    // `childrenLabel`, so a catalog that calls its children anything other than
    // "Sub-Resources" used to make this return null — reading as "this app has
    // no children" rather than as a broken selector.
    const heading = panel.querySelector('[data-testid="sub-resources-heading"]')
    if (!heading) return null

    const match = heading.textContent.match(/\((\d+) of (\d+)\)/)
    const visible = match?.[1] ? parseInt(match[1], 10) : 0
    const total = match?.[2] ? parseInt(match[2], 10) : 0

    const names: string[] = []
    let currentName: string | null = null
    const rows = panel.querySelectorAll('table tbody tr')
    rows.forEach((row) => {
      const nameCell = row.querySelector('td .font-medium')
      if (!nameCell?.textContent) return
      const name = nameCell.textContent.trim()
      names.push(name)
      if (row.getAttribute('aria-current') === 'true') currentName = name
    })

    return { total, visible, names, currentName }
  }

  /** Open a sub-resource's own page from the parent's sub-resource table. */
  async clickSubResourceInTable(displayName: string): Promise<void> {
    this.ensureTab('resources')
    const panel = this.getPanel()
    const links = Array.from(
      panel.querySelectorAll<HTMLElement>('table tbody tr td .font-medium'),
    )
    const target = links.find((el) => el.textContent.trim() === displayName)
    if (!target) {
      throw new Error(
        `Sub-resource "${displayName}" not found in the sub-resource table. ` +
          `Rows: [${links.map((el) => el.textContent.trim()).join(', ')}]`,
      )
    }
    await this.user.click(target)
  }

  /**
   * Read the access instructions from the detail panel.
   * Returns null if the tab is not present.
   *
   * Reads the TAB PANEL rather than hunting a "How to get access" heading: that
   * heading and the frame around it were removed when access became its own tab,
   * because the tab's own label already states what the panel is. Anchoring on the
   * panel is also sturdier — it survives the next heading rewording, which is what
   * broke this getter and nine tests through it.
   */
  getAccessText(): string | null {
    this.ensureTab('access')
    const panel = this.getPanel()
    // The section's own anchor first: a sub-resource page renders these
    // instructions with no tab strip at all, so reading the tab panel found
    // nothing there and returned an empty string rather than failing loudly.
    // ALL of them: the prerequisite chain and the instructions are two siblings
    // carrying the same anchor, and reading only the first dropped the parent's
    // name from a two-step chain.
    // Outermost only: a sub-resource page nests an AccessRequestSection inside its
    // own two-step region, and both carry the anchor. Taking all of them would read
    // the inner text twice.
    const all = [...panel.querySelectorAll('[data-access-section]')]
    const parts = all.filter(
      (el) => !all.some((other) => other !== el && other.contains(el)),
    )
    if (parts.length === 0) {
      const tabPanel = panel.querySelector('[role="tabpanel"]')
      return tabPanel ? tabPanel.textContent.trim() : null
    }
    return parts
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .join('\n')
  }

  screenshots = {
    /**
     * Click the screenshot preview to open the gallery modal.
     */
    open: async (): Promise<void> => {
      this.ensureTab('overview')
      const panel = this.getPanel()
      // By label, not by `.cursor-pointer`: that matched whichever styled
      // control happened to come first in the panel.
      const screenshotArea = panel.querySelector(
        '[aria-label^="View screenshots"]',
      )
      if (!screenshotArea) {
        throw new Error('No clickable screenshot found in detail panel')
      }
      await this.user.click(screenshotArea)
    },
  }

  /**
   * Asking for a correction, as a passing visitor does it.
   *
   * The composer is NOT in the notes panel — the affordance is in the card's band,
   * because at the foot of a tab it sat below the fold of a tab nobody opens unless
   * they already know what is in it. So `open()` goes through the band, which is also
   * what brings the notes tab forward.
   */
  feedback = {
    /** Click the band's "Suggest a change". */
    open: async (): Promise<void> => {
      const button = screen.getByRole('button', { name: /Suggest a change/i })
      await this.user.click(button)
    },

    describe: async (text: string): Promise<void> => {
      const field = screen.getByPlaceholderText('What should change?')
      await this.user.clear(field)
      await this.user.type(field, text)
    },

    /**
     * Attach `count` images through the real file input.
     *
     * A `File` with no bytes on purpose: the upload is mocked, and what this has to
     * prove is that the composer carries the returned ids through to submit.
     */
    attachImages: async (count = 1): Promise<void> => {
      const input =
        document.querySelector<HTMLInputElement>('input[type="file"]')
      if (!input) {
        throw new Error(
          'No file input in the composer — is it open? Call feedback.open() first.',
        )
      }
      const files = Array.from(
        { length: count },
        (_, i) =>
          new File([new Uint8Array([1])], `shot-${i}.png`, {
            type: 'image/png',
          }),
      )
      await this.user.upload(input, files)
    },

    send: async (): Promise<void> => {
      await this.user.click(screen.getByRole('button', { name: 'Send' }))
    },

    /** Bodies of the items in the thread, in the order shown. */
    threadBodies: (): string[] => {
      this.ensureTab('notes')
      const panel = this.getPanel()
      return Array.from(
        panel.querySelectorAll<HTMLElement>('[data-feedback-body]'),
      ).map((el) => el.textContent.trim())
    },

    /** How many attached images the thread shows across all items. */
    threadImageCount: (): number => {
      this.ensureTab('notes')
      return this.getPanel().querySelectorAll('img[alt="Attached screenshot"]')
        .length
    },

    /** The "N open" count beside the heading, or 0 when it is absent. */
    openCount: (): number => {
      this.ensureTab('notes')
      const label = this.getPanel().querySelector(
        '[aria-label$="awaiting review"]',
      )
      const match = /^(\d+)/.exec(label?.textContent ?? '')
      return match ? Number(match[1]) : 0
    },

    /** Whether the composer is currently on screen. */
    isComposerOpen: (): boolean =>
      !!document.querySelector('textarea[placeholder="What should change?"]'),
  }

  /** Click the "View replacement: <App>" link in a deprecated app's panel. */
  async clickViewReplacement(): Promise<void> {
    const btn = screen.getByRole('button', { name: /View replacement:/i })
    await this.user.click(btn)
  }

  /** The title shown in the currently open detail panel (empty if none). */
  getOpenTitle(): string {
    const panel = this.getPanel()
    return panel.querySelector('.app-door__title')?.textContent.trim() ?? ''
  }

  /**
   * The prominent primary "Open" button in the app detail card.
   * Returns the anchor element when the app has an appUrl, null otherwise.
   */
  getOpenButton(): HTMLAnchorElement | null {
    const panel = this.getPanel()
    return (
      panel.querySelector<HTMLAnchorElement>('[aria-label^="Open "]') ?? null
    )
  }

  /**
   * Get sub-resource detail panel data when a sub-resource is selected.
   * Returns null if the sub-resource detail panel is not shown.
   */
  getSubResourceDetail(): {
    subResourceName: string
    hasStep1: boolean
    hasStep2: boolean
    backButtonLabel: string | null
  } | null {
    const panel = document.querySelector<HTMLElement>(
      '[aria-label^="Back to "]',
    )
    if (!panel) return null

    const backButtonEl = document.querySelector<HTMLElement>(
      '[aria-label^="Back to "]',
    )
    const backButtonLabel = backButtonEl?.getAttribute('aria-label') ?? null

    // Sub-resource name: h2 in the detail panel area
    const h2 = document.querySelector('h2.text-xl')
    const subResourceName = (h2?.textContent ?? '').trim()

    // Step badges: circles with "1" and "2" text
    const stepBadges = Array.from(
      document.querySelectorAll<HTMLElement>('span.rounded-full'),
    )
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const getText = (el: HTMLElement) => (el.textContent ?? '').trim()
    const hasStep1 = stepBadges.some((el) => getText(el) === '1')
    const hasStep2 = stepBadges.some((el) => getText(el) === '2')

    return { subResourceName, hasStep1, hasStep2, backButtonLabel }
  }

  async clickBackToParent(): Promise<void> {
    const backButton = document.querySelector<HTMLButtonElement>(
      '[aria-label^="Back to "]',
    )
    if (!backButton) {
      throw new Error('Back-to-parent button not found in detail panel')
    }
    await this.user.click(backButton)
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
      if (h.textContent.includes(text)) return h
    }
    return null
  }

  private getNextSiblingText(heading: HTMLElement): string | null {
    const sibling = heading.nextElementSibling
    return sibling?.textContent.trim() ?? null
  }
}
