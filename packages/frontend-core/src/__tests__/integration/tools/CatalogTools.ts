import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export interface TableRow {
  name: string
  description: string
}

export class CatalogTools {
  private user = userEvent.setup()

  /**
   * Click an app row by display name.
   * Throws with list of visible apps if name not found.
   */
  async openApp(name: string): Promise<void> {
    const table = this.getCatalogTable()
    if (!table) throw new Error('No catalog table found')
    const rows = within(table).getAllByRole('row')

    for (const row of rows) {
      const nameEl = row.querySelector('.font-medium')
      if (nameEl?.textContent.trim() === name) {
        await this.user.click(row)
        return
      }
    }

    const visibleNames = this.getTableData().map((r) => r.name)
    throw new Error(
      `App "${name}" not found in table. Visible apps: [${visibleNames.join(', ')}]`,
    )
  }

  /**
   * Type into the search input.
   */
  async search(text: string): Promise<void> {
    const input = screen.getByRole('searchbox')
    await this.user.clear(input)
    await this.user.type(input, text)
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
      throw new Error('No table found on page')
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
   * Whether the right detail panel is currently visible.
   */
  isDetailPanelOpen(): boolean {
    return !!screen.queryByLabelText('Close details panel')
  }

  /**
   * Whether the onboarding/welcome card is visible.
   */
  isOnboardingVisible(): boolean {
    return !!screen.queryByText('Welcome to App Catalog')
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
