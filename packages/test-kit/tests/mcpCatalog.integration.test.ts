import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import type { AppCatalogData } from '@igstack/app-catalog-backend-core'
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

  it('a cached catalog from before MCP servers existed still loads /mcp', async () => {
    // A returning visitor's IndexedDB copy predates `mcpServers`.
    const { ui } = await given(
      magazine.mcp(({ browserStateCfg }) => {
        browserStateCfg.withOfflineData(
          ({ mcpServers: _, ...older }) =>
            ({
              ...older,
            }) as AppCatalogData,
        )
      }),
      { initialRoute: '/mcp' },
    )

    // Poll for 404 heading while waiting for rows — it should NEVER appear.
    const checkFor404 = setInterval(() => {
      const notFound = screen.queryByRole('heading', { name: /404 Not Found/i })
      if (notFound) {
        clearInterval(checkFor404)
        throw new Error('404 Not Found appeared during initial load')
      }
    }, 100)

    onTestFinished(() => clearInterval(checkFor404))

    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))
    clearInterval(checkFor404)
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

describe('MCP server detail: access, owner and sign-in lines', () => {
  it('an app slug that resolves to no app is a plain chip, not a link', async () => {
    await given(
      magazine.mcp(({ backendCfg }) => {
        backendCfg.withMcpServer({
          slug: 'orphan',
          displayName: 'Orphan Server',
          description: 'Needs an app the catalog does not list',
          category: 'data',
          status: 'production',
          access: 'read',
          requiredAppSlugs: ['taskflow', 'no-such-app'],
          auth: { kind: 'none' },
          transport: { type: 'http', url: 'https://orphan.example.com/mcp' },
          tools: [],
          sources: [],
        })
      }),
      { initialRoute: '/mcp/orphan' },
    )

    const dialog = await screen.findByRole('dialog', { name: 'Orphan Server' })
    const line = within(dialog).getByText(/To use this MCP you need access to:/)
    expect(
      within(line)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual(['/app/taskflow'])
    expect(within(line).getByText('no-such-app')).toBeInTheDocument()
  })

  it("owner shows a person's name, the slug for a nameless person, and the slug when unknown", async () => {
    const ownedBy = (slug: string, ownerSlug: string) =>
      magazine.mcp(({ backendCfg }) => {
        backendCfg.withPerson({
          slug: 'kim',
          email: 'kim@example.com',
          firstName: 'Kim',
          lastName: 'Ng',
        })
        backendCfg.withPerson({
          slug: 'nameless',
          email: 'nameless@example.com',
          firstName: ' ',
          lastName: '',
        })
        backendCfg.withMcpServer({
          slug,
          displayName: 'Owned Server',
          description: 'Has an owner',
          category: 'data',
          status: 'production',
          access: 'read',
          auth: { kind: 'none' },
          transport: { type: 'http', url: 'https://owned.example.com/mcp' },
          tools: [],
          sources: [],
          ownerSlug,
        })
      })
    const owner = async () =>
      within(
        await screen.findByRole('dialog', { name: 'Owned Server' }),
      ).getByTestId('mcp-tile-owner').textContent

    await given(ownedBy('owned', 'kim'), { initialRoute: '/mcp/owned' })
    expect(await owner()).toBe('OwnerKim Ng')
    await given(ownedBy('owned', 'nameless'), { initialRoute: '/mcp/owned' })
    expect(await owner()).toBe('Ownernameless')
    await given(ownedBy('owned', 'who-is-this'), { initialRoute: '/mcp/owned' })
    expect(await owner()).toBe('Ownerwho-is-this')
  })

  it('SSO without a note says a browser window opens to sign you in', async () => {
    await given(magazine.mcp(), { initialRoute: '/mcp/logs' })

    const dialog = await screen.findByRole('dialog', { name: 'Log Viewer' })
    expect(
      within(dialog).getByText('A browser window opens to sign you in.'),
    ).toBeInTheDocument()
  })
})

describe('MCP install', () => {
  const MENU = {
    groups: {
      'Install with': [
        'Claude Code in VS Code',
        'Claude Code in terminal',
        'Cursor',
        'Gemini CLI',
      ],
      'Text only': ['Copy prompt', 'Copy JSON config'],
    },
    footer: 'We remember your choice for next time.',
  }

  it('fresh visitor sees "Let me do it for you" and the default icon, and clicking opens the menu', async () => {
    // A new context: the harness deleted IndexedDB, and there is no reload.
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })
    await screen.findByRole('dialog', { name: 'Wiki Browser' })

    // Briefly a blank placeholder while IndexedDB answers; then the first visit.
    await waitFor(() =>
      expect(ui.mcp.installButton()).toEqual({
        label: 'Let me do it for you',
        icon: 'default',
      }),
    )
    await ui.mcp.clickInstall()
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(ui.mcp.installMenu()).toEqual(MENU)
  })

  it('picking Claude Code in terminal copies the command, shows "Copied", and the next visit\'s button says Install with that icon', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })
    await screen.findByRole('dialog', { name: 'Wiki Browser' })

    await ui.mcp.openInstallMenu()
    await ui.mcp.pickInstallOption('Claude Code in terminal')

    await waitFor(() =>
      expect(ui.mcp.installButton()).toEqual({
        label: 'Copied',
        icon: 'copied',
      }),
    )
    expect(await navigator.clipboard.readText()).toBe(
      "claude mcp add --transport http wiki https://wiki.example.com/mcp -H 'X-API-Key: <WIKI_TOKEN>'",
    )
    expect(ui.mcp.installMenu()).toBeNull()
    // Remembered: the menu now ticks it.
    await waitFor(() =>
      expect(ui.mcp.installButton()).toEqual({
        label: 'Install',
        icon: 'claude-code',
      }),
    )

    // The next visit: a reload keeps IndexedDB.
    const next = await given(magazine.mcp(), {
      initialRoute: '/mcp/wiki',
      reload: true,
    })
    await screen.findByRole('dialog', { name: 'Wiki Browser' })
    await waitFor(() =>
      expect(next.ui.mcp.installButton()).toEqual({
        label: 'Install',
        icon: 'claude-code',
      }),
    )
    await next.ui.mcp.openInstallMenu()
    expect(next.ui.mcp.installMenu()?.groups['Install with']).toContain(
      '*Claude Code in terminal',
    )
  })

  it('Claude Code in VS Code sets location to a vscode:// link whose prompt contains the server slug', async () => {
    const { ui } = await given(
      magazine.mcp(({ backendCfg }) => {
        backendCfg.withMcpCatalogConfig({ catalogMcpAvailable: true })
      }),
      { initialRoute: '/mcp/wiki' },
    )
    await screen.findByRole('dialog', { name: 'Wiki Browser' })

    await ui.mcp.openInstallMenu()
    await ui.mcp.pickInstallOption('Claude Code in VS Code')

    const url = ui.window.lastExternalUrl()
    expect(url).toMatch(/^vscode:\/\/anthropic\.claude-code\/open\?prompt=/)
    const prompt = new URL(url!).searchParams.get('prompt')
    expect(prompt).toContain(
      'Install this MCP server for me in Claude Code in VS Code',
    )
    expect(prompt).toContain('- Wiki Browser (name: wiki)')
    // The deployment says it serves the catalog's own MCP, so the AI is told to ask it.
    expect(prompt).toContain('call get_mcp_server')
  })

  it('without catalogMcpAvailable the prompt does not send the AI to a catalog MCP', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })
    await screen.findByRole('dialog', { name: 'Wiki Browser' })

    await ui.mcp.openInstallMenu()
    await ui.mcp.pickInstallOption('Claude Code in VS Code')

    const prompt = new URL(ui.window.lastExternalUrl()!).searchParams.get(
      'prompt',
    )
    expect(prompt).toContain('- Wiki Browser (name: wiki)')
    expect(prompt).not.toContain('get_mcp_server')
  })

  it('relative-URL server installs against the current origin', async () => {
    // From a search card: the result carries its own Install button.
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp?q=mail' })
    await waitFor(() =>
      expect(ui.mcp.searchResults().map((r) => r.name)).toEqual([
        'Mail Catcher',
      ]),
    )
    const card = screen.getByTestId('mcp-result')

    await ui.mcp.openInstallMenu(card)
    await ui.mcp.pickInstallOption('Copy JSON config')

    expect(JSON.parse(await navigator.clipboard.readText())).toEqual({
      mcpServers: {
        'mail-test': {
          type: 'http',
          url: `${window.location.origin}/mcp/mail`,
          headers: { 'X-Admin-Token': '<MAIL_ADMIN_TOKEN>' },
        },
      },
    })
    await waitFor(() => expect(ui.mcp.installButton(card).label).toBe('Copied'))
  })

  it('"What happens?" lists the config file for the chosen option and the token header name', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })
    await screen.findByRole('dialog', { name: 'Wiki Browser' })

    await ui.mcp.openWhatHappens()
    expect(ui.mcp.whatHappens().steps[0]).toBe(
      'Pick your AI above — The steps below adjust to it.',
    )

    const user = userEvent.setup()
    const popup = screen.getByRole('dialog', { name: /^What happens when/ })
    await user.click(within(popup).getByRole('button', { name: 'Cursor' }))

    // Cursor installs by hand: you fill in the token, and nothing tests it.
    await waitFor(() =>
      expect(ui.mcp.whatHappens()).toEqual({
        picked: 'Cursor',
        steps: [
          "Cursor shows its 'Install MCP server' dialog — You click Install there, and Cursor adds the server.",
          'Adds wiki to ~/.cursor/mcp.json — Your user settings (~/.cursor/mcp.json), not a repo.',
          'Replace <WIKI_TOKEN> in the config with your token from wiki.example.com — Go to wiki.example.com/settings/tokens; Click "Generate Token"; Copy the token. It stays in your user settings; never paste it into a chat.',
          'Ask your AI to call search_pages to check it works — Installing makes no test call of its own.',
        ],
        touches: ['~/.cursor/mcp.json', '1 token you create'],
        talksTo: ['wiki.example.com'],
      }),
    )
    // The pick is the remembered choice, so the popup's own button follows it.
    expect(ui.mcp.installButton(popup)).toEqual({
      label: 'Install',
      icon: 'cursor',
    })
    // With an AI the steps are guided, and the token goes into the header.
    await user.click(
      within(popup).getByRole('button', { name: 'Claude Code in VS Code' }),
    )
    await waitFor(() =>
      expect(ui.mcp.whatHappens().steps).toContain(
        'Helps you create your Wiki Browser token — Opens wiki.example.com and says which options to pick. You create it; it goes into header X-API-Key, never into the chat.',
      ),
    )
    // The full prompt sits collapsed under the actions.
    expect(within(popup).getByText('Show the full prompt')).toBeVisible()
    expect(within(popup).getByText(/name: wiki/)).not.toBeVisible()
    await user.click(
      within(popup).getByRole('button', { name: 'Copy full prompt' }),
    )
    expect(await navigator.clipboard.readText()).toContain(
      'Install this MCP server for me in Claude Code in VS Code',
    )
  })

  it('Mark as installed greys the row, shows "Installed", and survives reload', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))

    await ui.mcp.openMcpServer('Wiki Browser')
    await ui.mcp.toggleInstalled()
    const dialog = screen.getByRole('dialog', { name: 'Wiki Browser' })
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Installed here' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    )
    const user = userEvent.setup()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(ui.mcp.isRowInstalled('Wiki Browser')).toBe(true)
    expect(
      within(ui.mcp.mcpRow('Wiki Browser')).getByText('Installed'),
    ).toBeInTheDocument()
    expect(ui.mcp.isRowInstalled('Chat Search')).toBe(false)

    const next = await given(magazine.mcp(), {
      initialRoute: '/mcp',
      reload: true,
    })
    await waitFor(() =>
      expect(next.ui.mcp.isRowInstalled('Wiki Browser')).toBe(true),
    )
    expect(next.ui.mcp.isRowInstalled('Chat Search')).toBe(false)
  })

  it('Escape in the open menu inside the dialog closes the menu only; a second Escape closes the dialog', async () => {
    const { ui, router } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))
    await ui.mcp.openMcpServer('Wiki Browser')
    const opener = within(ui.mcp.mcpRow('Wiki Browser')).getByRole('link')

    await ui.mcp.openInstallMenu()
    const user = userEvent.setup()
    await user.keyboard('{Escape}')

    await waitFor(() => expect(ui.mcp.installMenu()).toBeNull())
    expect(screen.getByRole('dialog', { name: 'Wiki Browser' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/mcp/wiki')
    // The caret took the focus back, inside the dialog.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Choose how to install' }),
      ),
    )

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/mcp')
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('installIconUrl from config replaces the default icon', async () => {
    const { ui } = await given(
      magazine.mcp(({ backendCfg }) => {
        backendCfg.withMcpCatalogConfig({
          sensitiveDataLabel: 'Contains company data',
          installIconUrl: 'https://example.com/mcp-icon.svg',
        })
      }),
      { initialRoute: '/mcp/wiki' },
    )
    await screen.findByRole('dialog', { name: 'Wiki Browser' })

    await waitFor(() =>
      expect(ui.mcp.installButton()).toEqual({
        label: 'Let me do it for you',
        icon: 'custom',
      }),
    )
    const main = within(screen.getByTestId('mcp-install')).getAllByRole(
      'button',
    )[0]!
    expect(main.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/mcp-icon.svg',
    )
  })

  it('menu keys: focus starts on the first option, arrows and Home/End move, Tab closes', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })
    await screen.findByRole('dialog', { name: 'Wiki Browser' })
    await ui.mcp.openInstallMenu()
    const focused = () =>
      document.activeElement?.querySelector('b')?.textContent

    await waitFor(() => expect(focused()).toBe('Claude Code in VS Code'))
    const user = userEvent.setup()
    await user.keyboard('{ArrowDown}')
    expect(focused()).toBe('Claude Code in terminal')
    await user.keyboard('{End}')
    expect(focused()).toBe('Copy JSON config')
    await user.keyboard('{ArrowDown}')
    expect(focused()).toBe('Claude Code in VS Code')
    await user.keyboard('{Home}{ArrowUp}')
    expect(focused()).toBe('Copy JSON config')

    await user.keyboard('{Tab}')
    await waitFor(() => expect(ui.mcp.installMenu()).toBeNull())
    expect(screen.getByRole('dialog', { name: 'Wiki Browser' })).toBeVisible()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Choose how to install' }),
      ),
    )
  })

  it('a refused clipboard says "Copy failed" and still remembers the pick', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp/wiki' })
    await screen.findByRole('dialog', { name: 'Wiki Browser' })
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied'),
    )
    const execCommand = vi.fn(() => false)
    const original = document.execCommand
    document.execCommand = execCommand
    onTestFinished(() => {
      document.execCommand = original
      vi.restoreAllMocks()
    })

    await ui.mcp.openInstallMenu()
    await ui.mcp.pickInstallOption('Claude Code in terminal')

    await waitFor(() =>
      expect(ui.mcp.installButton()).toEqual({
        label: 'Copy failed',
        icon: 'copy-failed',
      }),
    )
    expect(execCommand).toHaveBeenCalledWith('copy')
    await waitFor(() =>
      expect(ui.mcp.installButton()).toEqual({
        label: 'Install',
        icon: 'claude-code',
      }),
    )
  })
})

describe('MCP cart', () => {
  it('add two servers, the cart shows both and a sensitive-data warning when one has it', async () => {
    const { ui, router } = await given(magazine.mcp(), { initialRoute: '/mcp' })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))
    expect(ui.mcp.cart()).toBeNull()

    // One from its home-list row: no sensitive data, so no warning yet.
    await ui.mcp.toggleCartFromRow('Wiki Browser')
    await waitFor(() =>
      expect(ui.mcp.cartContents()).toEqual({
        title: 'Cart · 1',
        items: ['Wiki Browser'],
        warning: '',
      }),
    )

    // One from its dialog, which keeps the cart while it opens and closes.
    await ui.mcp.openMcpServer('Code Search')
    expect(router.state.location.search).toEqual({ cart: 'wiki' })
    const user = userEvent.setup()
    await user.click(ui.mcp.cartButton())
    await waitFor(() =>
      expect(ui.mcp.cartButton()).toHaveAccessibleName('In cart'),
    )
    await ui.mcp.closeDetailPanel()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.search).toEqual({
      cart: 'wiki,code-search',
    })

    // The deployment's wording, not a hard-coded one.
    expect(ui.mcp.cartContents()).toEqual({
      title: 'Cart · 2',
      items: ['Wiki Browser', 'Code Search'],
      warning: 'Contains company data',
    })

    await ui.mcp.removeFromCart('Code Search')
    await waitFor(() =>
      expect(ui.mcp.cartContents().items).toEqual(['Wiki Browser']),
    )
    await ui.mcp.removeFromCart('Wiki Browser')
    await waitFor(() => expect(ui.mcp.cart()).toBeNull())
    expect(router.state.location.search).toEqual({})
  })

  it('Share copies a URL with ?cart=a,b', async () => {
    const { ui } = await given(magazine.mcp(), {
      initialRoute: '/mcp?q=wiki&cart=wiki,ticket-search',
    })
    await waitFor(() => expect(ui.mcp.cartContents().items).toHaveLength(2))

    await ui.mcp.shareCart()

    // The cart only: a shared link opens on the list, not on this search.
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/mcp?cart=wiki,ticket-search`,
    )
    await waitFor(() =>
      expect(
        within(ui.mcp.cart()!).getByRole('button', { name: /copied/i }),
      ).toBeInTheDocument(),
    )
  })

  it('opening ?cart=a,,a,nope shows only a, once, and leaves the URL as written', async () => {
    const { ui, router } = await given(magazine.mcp(), {
      initialRoute: '/mcp?cart=wiki,,wiki,nope',
    })

    await waitFor(() =>
      expect(ui.mcp.cartContents()).toEqual({
        title: 'Cart · 1',
        items: ['Wiki Browser'],
        warning: '',
      }),
    )
    // A shared link's slugs may exist on another deployment: keep them.
    expect(router.state.location.search).toEqual({ cart: 'wiki,,wiki,nope' })
    expect(router.history.length).toBe(1)
  })

  it('a cart of only unknown slugs shows no cart and keeps the param', async () => {
    const { ui, router } = await given(magazine.mcp(), {
      initialRoute: '/mcp?cart=nope,,',
    })
    await waitFor(() => expect(ui.mcp.getMcpRows()).toHaveLength(8))
    expect(router.state.location.search).toEqual({ cart: 'nope,,' })
    expect(ui.mcp.cart()).toBeNull()
  })

  it('a numeric slug in ?cart= and a numeric ?q= are kept, not dropped', async () => {
    // The router JSON-parses a search value, so `123` arrives as a number.
    const withNumericSlug = () =>
      magazine.mcp(({ backendCfg }) => {
        backendCfg.withMcpServer({
          slug: '123',
          displayName: 'Numbered Server',
          description: 'A server whose slug is all digits',
          category: 'data',
          status: 'production',
          access: 'read',
          auth: { kind: 'none' },
          transport: { type: 'http', url: 'https://n.example.com/mcp' },
          tools: [],
          sources: [],
        })
      })

    const { ui, router } = await given(withNumericSlug(), {
      initialRoute: '/mcp?cart=123',
    })
    await waitFor(() =>
      expect(ui.mcp.cartContents().items).toEqual(['Numbered Server']),
    )
    expect(router.state.location.search).toEqual({ cart: '123' })

    const next = await given(withNumericSlug(), { initialRoute: '/mcp?q=123' })
    await waitFor(() => expect(next.ui.mcp.getSearchInput()).toHaveValue('123'))
    expect(next.router.state.location.search).toEqual({ q: '123' })
  })

  it('Install on the cart with Cursor copies one JSON config for all of them', async () => {
    const { ui } = await given(magazine.mcp(), {
      initialRoute: '/mcp?cart=wiki,ticket-search',
    })
    await waitFor(() => expect(ui.mcp.cartContents().items).toHaveLength(2))
    const bar = ui.mcp.cart()!

    await ui.mcp.openInstallMenu(bar)
    await ui.mcp.pickInstallOption('Cursor')

    const config = JSON.parse(await navigator.clipboard.readText()) as {
      mcpServers: Record<string, unknown>
    }
    expect(Object.keys(config.mcpServers)).toEqual(['wiki', 'ticket-search'])
    // Copied, not opened: a Cursor link holds one server.
    expect(ui.window.lastExternalUrl()).toBeUndefined()
    await waitFor(() => expect(ui.mcp.installButton(bar).label).toBe('Copied'))

    await ui.mcp.openWhatHappens(bar)
    expect(
      screen.getByRole('dialog', {
        name: 'What happens when you install 2 servers',
      }),
    ).toBeInTheDocument()
  })

  it('Add to cart and In cart buttons have equal width', async () => {
    const { ui } = await given(magazine.mcp(), { initialRoute: '/mcp?q=wiki' })
    await waitFor(() => expect(ui.mcp.searchResults()).toHaveLength(1))
    const card = screen.getByTestId('mcp-result')
    const button = ui.mcp.cartButton(card)
    const before = {
      width: button.getBoundingClientRect().width,
      classes: widthClasses(button),
    }

    await userEvent.setup().click(button)
    await waitFor(() =>
      expect(ui.mcp.cartButton(card)).toHaveAccessibleName('In cart'),
    )
    const after = ui.mcp.cartButton(card)

    // jsdom lays nothing out (both widths are 0), so the width-defining
    // classes carry the claim here; the real boxes are measured in Chrome.
    expect(after.getBoundingClientRect().width).toBe(before.width)
    expect(widthClasses(after)).toEqual(before.classes)
    expect(before.classes).toContain('w-[120px]')
  })
})

/** The classes that set a box's width. */
function widthClasses(el: HTMLElement): string[] {
  return [...el.classList].filter((c) => /^(min-|max-)?w-/.test(c)).sort()
}
