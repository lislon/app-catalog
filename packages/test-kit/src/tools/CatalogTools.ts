import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export interface TableRow {
  name: string
  description: string
}

const rowText = (el: Element) => el.textContent.trim()

export class CatalogTools {
  private user = userEvent.setup()

  /**
   * Click an app row by display name.
   * Throws with list of visible apps if name not found.
   */
  async openApp(name: string): Promise<void> {
    const btn = screen.queryByTitle(`View ${name}`)
    if (btn) {
      await this.user.click(btn)
      // The card is a lazy chunk (#120), so it mounts a beat after the click.
      await screen.findByLabelText('Close details panel')
      return
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
    const input = screen.getByLabelText('Search apps')
    fireEvent.change(input, { target: { value: text } })
  }

  /** The catalog search input. */
  getSearchInput(): HTMLInputElement {
    return screen.getByLabelText<HTMLInputElement>('Search apps')
  }

  /**
   * The app rows currently on the page, as structured data.
   */
  getTableData(): TableRow[] {
    const rows = this.getAppRows()
    if (rows.length > 0) return rows

    // No rows at all: a global error is the likeliest cause, and its text is
    // far more useful than "nothing found".
    const bodyText = document.body.textContent
    if (
      bodyText.includes('Something went wrong') ||
      bodyText.includes('Ooops')
    ) {
      throw new Error(
        `Cannot read app rows — global error on page: ${bodyText.slice(0, 500)}`,
      )
    }
    throw new Error('No app rows found on page')
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
   * Read app rows off the catalog: buttons titled "View <name>". Description is
   * the `.text-muted-foreground` span. Deduped by name (an app can appear both
   * in "Your apps" and "Browse all").
   */
  private getAppRows(): TableRow[] {
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
   * The matched sub-resource rows shown under their parents in search results.
   * Selected by role + `data-kind`, not by styling — a Tailwind class is not a
   * contract, and these assertions outlived two rounds of restyling.
   */
  getSubResourceRows(): {
    visible: number
    total: number
    hasExpandRow: boolean
    names: string[]
    /** Name of the row marked `aria-current`, if any. */
    currentName: string | null
  } | null {
    const subRows = this.querySubRows('sub')
    const expandRow = this.querySubRows('more')[0] ?? null
    if (subRows.length === 0 && !expandRow) return null

    const hidden = expandRow ? /\d+/.exec(rowText(expandRow)) : null

    return {
      visible: subRows.length,
      total: subRows.length + (hidden?.[0] ? parseInt(hidden[0], 10) : 0),
      hasExpandRow: !!expandRow,
      names: subRows.map(rowText),
      currentName:
        subRows
          .filter((el) => el.getAttribute('aria-current') === 'true')
          .map(rowText)[0] ?? null,
    }
  }

  async clickSubResource(displayName: string): Promise<void> {
    const target = this.querySubRows('sub').find(
      (el) => rowText(el) === displayName,
    )
    if (!target) {
      throw new Error(
        `Sub-resource "${displayName}" not found in search result rows. ` +
          `Visible: [${this.querySubRows('sub').map(rowText).join(', ')}]`,
      )
    }
    await this.user.click(target)
  }

  async expandSubResources(): Promise<void> {
    const expandRow = this.querySubRows('more')[0]
    if (!expandRow) {
      throw new Error('No expand ("... N more") row found in search results')
    }
    await this.user.click(expandRow)
  }

  private querySubRows(kind: 'sub' | 'more'): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        `[role="option"][data-kind="${kind}"]`,
      ),
    )
  }
}
