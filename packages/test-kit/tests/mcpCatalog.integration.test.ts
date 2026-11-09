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
})
