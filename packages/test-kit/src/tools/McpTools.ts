import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export interface McpServerRow {
  name: string
  category: string
}

export interface McpSearchCard {
  name: string
  /** The tool the card says your AI calls; empty for a server with no tools. */
  calls: string
  /** Every highlighted fragment on the card, in order. */
  marked: string[]
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
    const row = screen
      .queryAllByTestId('mcp-row')
      .find(
        (r) =>
          within(r).getByTestId('mcp-row-name').textContent.trim() === name,
      )
    if (!row) {
      const visibleNames = this.getMcpRows().map((r) => r.name)
      throw new Error(
        `MCP server row "${name}" not found. Visible servers: [${visibleNames.join(', ')}]`,
      )
    }
    return row
  }

  /**
   * The Triad's spelled-out answer for a server's row.
   */
  triadLabel(name: string): string {
    return (
      within(this.mcpRow(name)).getByRole('img').getAttribute('aria-label') ??
      ''
    )
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
   * The home list's rows in page order, each with its category heading.
   */
  getMcpRows(): McpServerRow[] {
    const groups = screen.queryAllByTestId('mcp-category')
    if (groups.length === 0) {
      const bodyText = document.body.textContent
      if (
        bodyText.includes('Something went wrong') ||
        bodyText.includes('Ooops')
      ) {
        throw new Error(
          `Cannot read MCP rows — global error on page: ${bodyText.slice(0, 500)}`,
        )
      }
      throw new Error('No MCP server rows found on page')
    }
    return groups.flatMap((group) => {
      const category = within(group).getByRole('heading').textContent.trim()
      return within(group)
        .getAllByTestId('mcp-row-name')
        .map((n) => ({ name: n.textContent.trim(), category }))
    })
  }

  /**
   * The search-state cards, best match first.
   */
  searchResults(): McpSearchCard[] {
    return screen.queryAllByTestId('mcp-result').map((card) => ({
      name: within(card).getByTestId('mcp-result-name').textContent.trim(),
      calls:
        within(card).queryByTestId('mcp-result-calls')?.textContent.trim() ??
        '',
      marked: [...card.querySelectorAll('mark')].map((m) => m.textContent),
    }))
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
