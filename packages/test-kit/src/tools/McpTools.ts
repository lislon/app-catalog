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
   * Open a server's detail dialog from its home-list row or its search card,
   * by display name, and wait for the dialog.
   * Throws with the list of visible servers if the name is not on screen.
   */
  async openMcpServer(name: string): Promise<void> {
    const link = screen
      .queryAllByRole('link', { name })
      .find((a) =>
        a.closest('[data-testid="mcp-row"], [data-testid="mcp-result"]'),
      )
    if (link) {
      await this.user.click(link)
      await screen.findByRole('dialog', { name })
      return
    }

    const visibleNames = [
      ...screen.queryAllByTestId('mcp-row-name'),
      ...screen.queryAllByTestId('mcp-result-name'),
    ].map((n) => n.textContent.trim())
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
   * Where the install controls are looked up: the dialog on top, else the page.
   */
  private scope(): HTMLElement {
    return screen.queryAllByRole('dialog').at(-1) ?? document.body
  }

  /**
   * The split Install button in `scope` (default: the dialog on top): its
   * label, and which icon it shows: `default` (the neutral sparkle), `custom`
   * (the deployment's `installIconUrl`) or the remembered option's id.
   */
  installButton(scope: HTMLElement = this.scope()): {
    label: string
    icon: string
  } {
    const main = within(within(scope).getByTestId('mcp-install')).getAllByRole(
      'button',
    )[0]!
    return {
      label: main.textContent.trim(),
      icon: main.getAttribute('data-icon') ?? '',
    }
  }

  /** Clicks the Install button's main half in `scope`. */
  async clickInstall(scope: HTMLElement = this.scope()): Promise<void> {
    const main = within(within(scope).getByTestId('mcp-install')).getAllByRole(
      'button',
    )[0]!
    await this.user.click(main)
  }

  /** Opens the install menu from the caret in `scope`, and waits for it. */
  async openInstallMenu(scope: HTMLElement = this.scope()): Promise<void> {
    await this.user.click(
      within(scope).getByRole('button', { name: 'Choose how to install' }),
    )
    await screen.findByRole('menu', { name: 'Choose how to install' })
  }

  /**
   * The open install menu: each group's options (`*` marks the remembered
   * one) and the footer. Null when no menu is open.
   */
  installMenu(): { groups: Record<string, string[]>; footer: string } | null {
    const menu = screen.queryByRole('menu', { name: 'Choose how to install' })
    if (!menu) return null
    const groups: Record<string, string[]> = {}
    for (const group of within(menu).getAllByRole('group')) {
      groups[group.getAttribute('aria-label') ?? ''] = within(group)
        .getAllByRole('menuitemradio')
        .map(
          (item) =>
            (item.getAttribute('aria-checked') === 'true' ? '*' : '') +
            (item.querySelector('b')?.textContent ?? ''),
        )
    }
    return {
      groups,
      footer: menu.querySelector('[data-slot="footer"]')?.textContent ?? '',
    }
  }

  /** Picks an option in the open install menu by its label. */
  async pickInstallOption(label: string): Promise<void> {
    const menu = screen.getByRole('menu', { name: 'Choose how to install' })
    await this.user.click(
      within(menu).getByRole('menuitemradio', {
        name: new RegExp(`^${label}`),
      }),
    )
  }

  /** Opens "What happens?" from `scope` and waits for its popup. */
  async openWhatHappens(scope: HTMLElement = this.scope()): Promise<void> {
    await this.user.click(
      within(scope).getByRole('button', { name: 'What happens?' }),
    )
    await screen.findByRole('dialog', { name: /^What happens when/ })
  }

  /**
   * The open "What happens?" popup: the picked option, each step as
   * "title — detail", the "Touches on your machine" chips and the "Talks to"
   * hosts.
   */
  whatHappens(): {
    picked: string
    steps: string[]
    touches: string[]
    talksTo: string[]
  } {
    const popup = screen.getByRole('dialog', { name: /^What happens when/ })
    const chips = (testId: string) =>
      [
        ...(within(popup).queryByTestId(testId)?.querySelectorAll('span') ??
          []),
      ].map((chip) => chip.textContent.trim())
    return {
      picked:
        within(popup)
          .queryAllByRole('button', { pressed: true })[0]
          ?.textContent.trim() ?? '',
      steps: within(within(popup).getByTestId('mcp-what-steps'))
        .getAllByRole('listitem')
        .map(
          (li) =>
            `${li.querySelector('b')?.textContent} — ${li.querySelector('span')?.textContent}`,
        ),
      touches: chips('mcp-what-touches'),
      talksTo: chips('mcp-what-talks-to'),
    }
  }

  /** Clicks "Mark as installed" (or its pressed "Installed here") in `scope`. */
  async toggleInstalled(scope: HTMLElement = this.scope()): Promise<void> {
    await this.user.click(
      within(scope).getByRole('button', {
        name: /^(Mark as installed|Installed here)$/,
      }),
    )
  }

  /** Whether a home-list row is marked installed (greyed, "Installed" badge). */
  isRowInstalled(name: string): boolean {
    return this.mcpRow(name).hasAttribute('data-installed')
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
