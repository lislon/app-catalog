import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import { given, magazine } from '@igstack/app-catalog-test-kit'

// The MCP servers tab: a catalog of servers that plug company systems into an
// AI assistant. magazine.mcp() is the full catalog plus 8 servers covering all
// eight Triad combinations, two configured categories and four unconfigured
// ones; magazine.full() lists no servers at all.

const mcpTab = () =>
  within(screen.getByTestId('section-tabs')).queryByRole('link', {
    name: /^MCP servers/,
  })

describe('MCP servers tab', () => {
  it('tab shows with servers and hides without', async () => {
    await given(magazine.full(), { initialRoute: '/' })
    await screen.findByLabelText('Search apps')
    await waitFor(() =>
      expect(screen.getByTestId('section-tabs')).toHaveTextContent(
        'Service Desks',
      ),
    )
    expect(mcpTab()).toBeNull()

    await given(magazine.mcp(), { initialRoute: '/' })
    await waitFor(() => expect(mcpTab()).toBeInTheDocument())
    expect(mcpTab()).toHaveAttribute('href', '/mcp')
    expect(mcpTab()).toHaveTextContent('Plug company systems into your AI')
  })

  it('searching a tool name ranks that server first and highlights the tool', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    // Database Query has a tool called `query`; Log Viewer has `query_logs`.
    const user = userEvent.setup()
    await user.type(ui.mcp.getSearchInput(), 'query')

    await waitFor(() =>
      expect(ui.mcp.searchResults().map((r) => r.name)).toEqual([
        'Database Query',
        'Log Viewer',
      ]),
    )
    const [first, second] = ui.mcp.searchResults()
    expect(first?.calls).toBe('query')
    expect(second?.calls).toBe('query_logs')
    expect(second?.marked).toContain('query')
    expect(screen.getByText('Best match')).toBeInTheDocument()
  })

  it('?q= in the URL restores the search', async () => {
    const { ui, router } = await given(magazine.mcp(), {
      initialRoute: '/mcp?q=wiki',
    })

    await waitFor(() =>
      expect(ui.mcp.searchResults().map((r) => r.name)).toEqual([
        'Wiki Browser',
      ]),
    )
    expect(ui.mcp.getSearchInput()).toHaveValue('wiki')

    // And the box writes back, so the search can be shared.
    await ui.mcp.searchMcp('chat')
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ q: 'chat' }),
    )
  })

  it('rows group by configured category order, unknown categories last alphabetically', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp' })

    await waitFor(() =>
      expect(ui.mcp.getMcpRows()).toEqual([
        { category: 'Productivity', name: 'Ticket Search' },
        { category: 'Developer Tools', name: 'Code Search' },
        { category: 'Developer Tools', name: 'Local Filesystem' },
        { category: 'Developer Tools', name: 'Mail Catcher' },
        { category: 'communication', name: 'Chat Search' },
        { category: 'data', name: 'Database Query' },
        { category: 'knowledge', name: 'Wiki Browser' },
        { category: 'observability', name: 'Log Viewer' },
      ]),
    )
  })

  it('Triad label says "Can write · Needs access: … · Sensitive data"', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    // The sensitive-data wording is the deployment's (config: "Contains company data").
    expect(ui.mcp.triadLabel('Database Query')).toBe(
      'Can write · Needs access: TeamChat · Contains company data',
    )
    expect(ui.mcp.triadLabel('Wiki Browser')).toBe(
      'Read-only · No extra access · No sensitive data',
    )
  })

  it('intent tiles and try chips come from config', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Search Tickets/ }))
    await waitFor(() =>
      expect(ui.mcp.searchResults().map((r) => r.name)).toEqual([
        'Ticket Search',
      ]),
    )
    expect(screen.getByRole('button', { name: 'tickets' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('clicking the tab on /mcp?q=logs empties the box and shows the home list', async () => {
    const { ui, router } = await given(magazine.mcp(), {
      initialRoute: '/mcp?q=logs',
    })
    await waitFor(() =>
      expect(ui.mcp.searchResults().map((r) => r.name)).toEqual(['Log Viewer']),
    )

    const user = userEvent.setup()
    await user.click(mcpTab()!)

    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))
    expect(ui.mcp.getSearchInput()).toHaveValue('')
    expect(ui.mcp.searchResults()).toEqual([])
    expect(router.state.location.search).toEqual({})
  })

  it('typing keeps the page and every character', async () => {
    const { ui, router } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    const user = userEvent.setup()
    await user.type(ui.mcp.getSearchInput(), 'list_tables')

    await waitFor(() =>
      expect(router.state.location.search).toEqual({ q: 'list_tables' }),
    )
    expect(router.state.location.pathname).toBe('/mcp')
    expect(ui.mcp.getSearchInput()).toHaveValue('list_tables')
  })

  it('a catalog without MCP servers answers /mcp with not found', async () => {
    await given(magazine.full(), { initialRoute: '/mcp' })

    expect(
      await screen.findByRole('heading', { name: '404 Not Found' }),
    ).toBeInTheDocument()
  })

  it('finds a server by its category title and its owner', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    // "Developer Tools" is the configured title of the dev-tools key.
    await ui.mcp.searchMcp('developer')
    await waitFor(() =>
      expect(
        ui.mcp
          .searchResults()
          .map((r) => r.name)
          .sort(),
      ).toEqual(['Code Search', 'Local Filesystem', 'Mail Catcher']),
    )

    // Log Viewer is owned by the AI Platform Team group.
    await ui.mcp.searchMcp('platform team')
    await waitFor(() =>
      expect(ui.mcp.searchResults().map((r) => r.name)).toEqual(['Log Viewer']),
    )
  })

  it('the legend samples are hidden from assistive tech and not focusable', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    // One labelled Triad per row and nothing else: the legend's three are decoration.
    expect(
      screen
        .getAllByRole('img')
        .filter((img) => img.closest('svg[viewBox="0 0 44 44"]')),
    ).toHaveLength(8)
    const legend = screen.getByText('left dot: needs access')
    expect(legend.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(legend.querySelector('[tabindex]')).toBeNull()
  })
})

describe('MCP server detail', () => {
  it('/mcp/<slug> opens the dialog over the list', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })

    const dialog = await screen.findByRole('dialog', { name: 'Wiki Browser' })
    // The list stays mounted under it.
    expect(ui.mcp.getMcpRows()).toHaveLength(8)
    // Beta says so; the token steps start collapsed.
    expect(within(dialog).getByText('Beta')).toBeInTheDocument()
    expect(within(dialog).getByText('How to get the token')).toBeVisible()
    expect(within(dialog).getByText('Click "Generate Token"')).not.toBeVisible()
    expect(
      within(dialog).getByRole('row', {
        name: 'search_pages Search wiki pages',
      }),
    ).toBeInTheDocument()
  })

  it('the description is body text and the name sits above it', async () => {
    await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })

    const dialog = await screen.findByRole('dialog', { name: 'Wiki Browser' })
    const name = within(dialog).getByRole('heading', { name: 'Wiki Browser' })
    const description = within(dialog).getByText(
      'Search documentation and wiki pages',
    )
    expect(description.tagName).toBe('P')
    expect(
      name.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('access line links each required app to its card', async () => {
    await given(magazine.mcp(), { initialRoute: '/mcp/ticket-search' })

    const dialog = await screen.findByRole('dialog', { name: 'Ticket Search' })
    const line = within(dialog).getByText(/To use this MCP you need access to:/)
    expect(
      within(line).getByRole('link', { name: 'TaskFlow' }),
    ).toHaveAttribute('href', '/app/taskflow')
  })

  it("owner shows a group's display name", async () => {
    await given(magazine.mcp(), { initialRoute: '/mcp/logs' })

    const dialog = await screen.findByRole('dialog', { name: 'Log Viewer' })
    expect(within(dialog).getByTestId('mcp-tile-owner')).toHaveTextContent(
      'OwnerAI Platform Team',
    )
    expect(
      within(dialog).getByRole('link', { name: /Support.*#logs-help/ }),
    ).toHaveAttribute('href', 'https://chat.example.com/logs-help')
    // Production is the default and goes unmarked.
    expect(within(dialog).queryByText('Production')).toBeNull()
    // The deployment's sensitive-data wording.
    expect(
      within(dialog).getByText('Contains company data'),
    ).toBeInTheDocument()
  })

  it('sources render through SourcesList with pulse', async () => {
    await given(magazine.mcp(), { initialRoute: '/mcp/logs' })

    const dialog = await screen.findByRole('dialog', { name: 'Log Viewer' })
    const tiles = within(dialog).getAllByTestId('mcp-tile-source')
    expect(
      tiles.map((t) => within(t).getByRole('link').getAttribute('href')),
    ).toEqual([
      'https://logs.example.com/docs',
      'https://github.com/example/log-viewer-mcp',
    ])
    // Only the source the autoupdate loop has seen carries the pulse.
    expect(
      within(tiles[0]!).getByLabelText(/^Source freshness: checked daily/),
    ).toBeInTheDocument()
    expect(within(tiles[1]!).queryByLabelText(/^Source freshness/)).toBeNull()
  })

  it('Escape closes the dialog and focus returns to the row', async () => {
    const { ui, router } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    await ui.mcp.openMcpServer('Wiki Browser')
    expect(router.state.location.pathname).toBe('/mcp/wiki')
    const opener = within(ui.mcp.mcpRow('Wiki Browser')).getByRole('link')

    const user = userEvent.setup()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/mcp')
    await waitFor(() => expect(document.activeElement).toBe(opener))

    // A second Escape has nothing left to close and leaves the page alone.
    await user.keyboard('{Escape}')
    expect(router.state.location.pathname).toBe('/mcp')
    expect(ui.mcp.getMcpRows()).toHaveLength(8)
  })

  it('the search survives opening and closing a server', async () => {
    const { ui, router } = await given(magazine.mcp(), {
      initialRoute: '/mcp?q=logs',
    })
    await waitFor(() =>
      expect(ui.mcp.searchResults().map((r) => r.name)).toEqual(['Log Viewer']),
    )

    await ui.mcp.openMcpServer('Log Viewer')
    expect(router.state.location.pathname).toBe('/mcp/logs')
    expect(router.state.location.search).toEqual({ q: 'logs' })

    await ui.mcp.closeDetailPanel()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/mcp')
    expect(router.state.location.search).toEqual({ q: 'logs' })
    expect(ui.mcp.getSearchInput()).toHaveValue('logs')
  })

  it('an unknown slug says so inside the dialog', async () => {
    await given(magazine.mcp(), { initialRoute: '/mcp/no-such-server' })

    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText(
        'No MCP server is listed at this address.',
      ),
    ).toBeInTheDocument()
  })
})
