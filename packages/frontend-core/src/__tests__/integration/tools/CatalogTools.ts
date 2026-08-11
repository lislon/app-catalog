import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export interface TableRow {
  name: string
  description: string
}

export class CatalogTools {
  private user = userEvent.setup()

  /**
   * Click an app row by display name.
   * Works against both the table/grid view and the launcher home (#38), which
   * renders app rows as buttons rather than a <table>.
   * Throws with list of visible apps if name not found.
   */
  async openApp(name: string): Promise<void> {
    const table = this.getCatalogTable()
    if (table) {
      const rows = within(table).getAllByRole('row')
      for (const row of rows) {
        const nameEl = row.querySelector('.font-medium')
        if (nameEl?.textContent.trim() === name) {
          await this.user.click(row)
          return
        }
      }
    } else {
      // Launcher home: rows are buttons titled "View <name>".
      const btn = screen.queryByTitle(`View ${name}`)
      if (btn) {
        await this.user.click(btn)
        return
      }
    }

    const visibleNames = this.getTableData().map((r) => r.name)
    throw new Error(
      `App "${name}" not found. Visible apps: [${visibleNames.join(', ')}]`,
    )
  }

  /**
   * Type into the search input.
   */
  async search(text: string): Promise<void> {
    const input = this.getSearchInput()
    await this.user.clear(input)
    await this.user.type(input, text)
  }

  /** The catalog search input. */
  getSearchInput(): HTMLInputElement {
    return screen.getByLabelText<HTMLInputElement>('Search apps')
  }

  /**
   * Parse the catalog table into structured data.
   * Skips group header rows (colspan rows).
   */
  getTableData(): TableRow[] {
    const table = this.getCatalogTable()
    if (!table) {
      // Check if there's a global error — throw with details for debugging
      const bodyText = document.body.textContent
      if (
        bodyText.includes('Something went wrong') ||
        bodyText.includes('Ooops')
      ) {
        throw new Error(
          `Cannot read table — global error on page: ${bodyText.slice(0, 500)}`,
        )
      }
      // Launcher home (#38): no <table>; read the app row buttons instead.
      const launcherRows = this.getLauncherRows()
      if (launcherRows.length > 0) return launcherRows
      throw new Error('No table or launcher rows found on page')
    }

    const rows = within(table).getAllByRole('row')
    const result: TableRow[] = []

    for (const row of rows) {
      const cells = within(row).queryAllByRole('cell')
      // Skip header rows and group header rows (single cell with colspan)
      if (cells.length < 2) continue

      const nameEl = cells[0]?.querySelector('.font-medium')
      if (!nameEl) continue

      result.push({
        name: nameEl.textContent.trim(),
        description: cells[1]?.textContent.trim() ?? '',
      })
    }

    return result
  }

  /**
   * The secondary "open in new tab" launch link for a row, by app name.
   * Returns null if the row has no launch link.
   */
  getLaunchLink(name: string): HTMLAnchorElement | null {
    // The launch link's aria-label starts with "Open <name> in a new tab" and
    // may append the destination URL, e.g. "… in a new tab (foo.example.com)".
    return screen.queryByLabelText<HTMLAnchorElement>(
      new RegExp(`^Open ${name} in a new tab`),
    )
  }

  /**
   * Whether the right detail panel is currently visible.
   */
  isDetailPanelOpen(): boolean {
    return !!screen.queryByLabelText('Close details panel')
  }

  /** Whether the "Show Deprecated Apps" toggle is currently checked. */
  isShowDeprecatedChecked(): boolean {
    const cb = screen.getByRole('checkbox', { name: /Show Deprecated Apps/i })
    return (
      cb.getAttribute('aria-checked') === 'true' ||
      cb.getAttribute('data-state') === 'checked'
    )
  }

  /** Whether the "showing deprecated matches" fallback notice is visible. */
  hasDeprecatedFallbackNotice(): boolean {
    return !!screen.queryByText(/showing deprecated matches/i)
  }

  /** Whether the "No apps found" empty state or search-morph "No results for" is visible. */
  isEmptyStateVisible(): boolean {
    return (
      !!screen.queryByText(/No apps found/i) ||
      !!screen.queryByText(/No results for/i)
    )
  }

  /**
   * Whether the onboarding/welcome card is visible.
   */
  isOnboardingVisible(): boolean {
    return !!screen.queryByText('Welcome to App Catalog')
  }

  /**
   * Read app rows from the launcher home (#38): buttons titled "View <name>".
   * Name is the first `.font-semibold`/`.font-bold` span; description the
   * `.text-muted-foreground` span. Deduped by name (an app can appear both in
   * "Your apps" and "Browse all").
   */
  private getLauncherRows(): TableRow[] {
    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>('button[title^="View "]'),
    )
    const seen = new Set<string>()
    const result: TableRow[] = []
    for (const btn of buttons) {
      const name = (btn.getAttribute('title') ?? '')
        .replace(/^View\s+/, '')
        .trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      const descEl = btn.querySelector('.text-muted-foreground')
      result.push({ name, description: descEl?.textContent.trim() ?? '' })
    }
    return result
  }

  /**
   * Get expandable subresource rows shown under parents in search results.
   * Returns null if no sub-rows are visible.
   */
  getSubResourceRows(): {
    visible: number
    total: number
    hasExpandRow: boolean
    names: string[]
  } | null {
    const subButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[class*="border-l-2"]',
      ),
    )
    if (subButtons.length === 0) return null

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const getText = (el: HTMLButtonElement) => (el.textContent ?? '').trim()
    const isExpandRow = (el: HTMLButtonElement) => getText(el).startsWith('...')

    const expandButton = subButtons.find(isExpandRow)
    const hasExpandRow = !!expandButton

    let hiddenCount = 0
    if (expandButton) {
      const match = /\d+/.exec(getText(expandButton))
      hiddenCount = match?.[0] ? parseInt(match[0], 10) : 0
    }

    const visibleSubs = subButtons.filter((b) => !isExpandRow(b))

    return {
      visible: visibleSubs.length,
      total: visibleSubs.length + hiddenCount,
      hasExpandRow,
      names: visibleSubs.map((b) => getText(b)),
    }
  }

  async clickSubResource(displayName: string): Promise<void> {
    const subButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[class*="border-l-2"]',
      ),
    )
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const getText = (el: HTMLButtonElement) => (el.textContent ?? '').trim()
    const target = subButtons.find(
      (b) =>
        getText(b) === displayName && !getText(b).trimStart().startsWith('...'),
    )
    if (!target) {
      throw new Error(
        `Sub-resource "${displayName}" not found in search result rows`,
      )
    }
    await this.user.click(target)
  }

  async expandSubResources(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const getText = (el: HTMLButtonElement) => (el.textContent ?? '').trim()
    const expandButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[class*="border-l-2"]',
      ),
    ).filter((b) => getText(b).trimStart().startsWith('...'))
    if (expandButtons.length === 0) {
      throw new Error('No expand ("...N more") button found')
    }
    await this.user.click(expandButtons[0]!)
  }

  /**
   * Get the main catalog table (first table on page, skipping sub-resource tables in detail panel).
   */
  private getCatalogTable(): HTMLElement | null {
    const tables = screen.queryAllByRole('table')
    // The catalog table is the first table; sub-resource tables appear later in the detail panel
    return tables[0] ?? null
  }
}
