import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export interface McpServerRow {
  name: string
  description: string
}

export class McpTools {
  private user = userEvent.setup()

  /**
   * Type into the MCP search input.
   */
  async searchMcp(query: string): Promise<void> {
    const input = screen.getByLabelText(/search.*mcp/i)
    fireEvent.change(input, { target: { value: query } })
  }

  /**
   * Click an MCP server row by display name to open details.
   * Throws with list of visible servers if name not found.
   */
  async openMcpServer(name: string): Promise<void> {
    const btn = screen.queryByTitle(`View ${name}`)
    if (btn) {
      await this.user.click(btn)
      await screen.findByLabelText('Close details panel')
      return
    }

    const visibleNames = this.getMcpRows().map((r) => r.name)
    throw new Error(
      `MCP server "${name}" not found. Visible servers: [${visibleNames.join(', ')}]`,
    )
  }

  /**
   * Get a specific MCP server row element by name.
   */
  mcpRow(name: string): HTMLElement {
    const row = screen.queryByTitle(`View ${name}`)
    if (!row) {
      const visibleNames = this.getMcpRows().map((r) => r.name)
      throw new Error(
        `MCP server row "${name}" not found. Visible servers: [${visibleNames.join(', ')}]`,
      )
    }
    return row.closest('[role="row"]') || row
  }

  /**
   * Get the install menu button (typically in the detail panel).
   */
  installMenu(): HTMLElement {
    return screen.getByLabelText(/install|add to/i)
  }

  /**
   * Get the install cart/basket element (shows selected servers).
   */
  cart(): HTMLElement {
    return screen.getByLabelText(/cart|basket|selected/i)
  }

  /**
   * The MCP server rows currently on the page, as structured data.
   */
  getMcpRows(): McpServerRow[] {
    const rows = screen.queryAllByRole('row')
    if (rows.length === 0) {
      const bodyText = document.body.textContent
      if (
        bodyText &&
        (bodyText.includes('Something went wrong') ||
          bodyText.includes('Ooops'))
      ) {
        throw new Error(
          `Cannot read MCP rows — global error on page: ${bodyText.slice(0, 500)}`,
        )
      }
      throw new Error('No MCP server rows found on page')
    }

    return rows
      .slice(1) // skip header row
      .map((row) => {
        const cells = row.querySelectorAll('[role="cell"]')
        const name = cells[0]?.textContent
        const description = cells[1]?.textContent
        return {
          name: name ? name.trim() : '',
          description: description ? description.trim() : '',
        }
      })
      .filter((r) => r.name) // skip empty rows
  }

  /**
   * Get the MCP search input element.
   */
  getSearchInput(): HTMLInputElement {
    return screen.getByLabelText<HTMLInputElement>(/search.*mcp/i)
  }

  /**
   * Whether the MCP detail panel is currently visible.
   */
  isDetailPanelVisible(): boolean {
    return !!screen.queryByLabelText('Close details panel')
  }

  /**
   * Close the detail panel if open.
   */
  async closeDetailPanel(): Promise<void> {
    const closeBtn = screen.queryByLabelText('Close details panel')
    if (closeBtn) {
      await this.user.click(closeBtn)
    }
  }
}
