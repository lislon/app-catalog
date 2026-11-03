/**
 * Pure functions that build install commands, deep links, JSON config,
 * the install prompt and "What happens?" steps for MCP servers.
 * Used by both frontend-core and company-side MCP tools.
 * Never reads window — always takes inputs explicitly.
 */

import type { McpServer } from './mcpServerTypes'

export type InstallOptionId =
  | 'claude-vscode'
  | 'claude-code'
  | 'claude-desktop'
  | 'cursor'
  | 'gemini'
  | 'prompt'
  | 'json'

const CFG_FILE: Record<InstallOptionId, string> = {
  'claude-vscode': '~/.claude.json',
  'claude-code': '~/.claude.json',
  'claude-desktop': '~/.claude.json',
  cursor: '~/.cursor/mcp.json',
  gemini: '~/.gemini/settings.json',
  prompt: "your AI's own MCP settings",
  json: 'the config file you paste into',
}

/**
 * Makes a relative `transport.url` absolute.
 * HTTP transport: prefixes relative URLs with origin.
 * Stdio transport: unchanged.
 */
export function resolveUrl(server: McpServer, origin: string): McpServer {
  if (server.transport.type !== 'http') return server
  const url = server.transport.url
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return server
  }
  return {
    ...server,
    transport: {
      ...server.transport,
      url: `${origin}${url.startsWith('/') ? '' : '/'}${url}`,
    },
  }
}

/**
 * Builds a `claude mcp add` or `gemini mcp add` command for one or more servers.
 * Multi-server: joins with ` && \\\n  `.
 */
export function cliCommand(
  option: 'claude-code' | 'gemini',
  servers: McpServer[],
): string {
  const cmd = option === 'claude-code' ? 'claude' : 'gemini'
  return servers
    .map((s) => {
      if (s.transport.type === 'http') {
        const headers = s.transport.headers
          ? Object.entries(s.transport.headers)
              .map(([k, v]) => {
                const escaped = v.replace(/"/g, '\\"')
                return ` -H "${k}: ${escaped}"`
              })
              .join('')
          : ''
        return `${cmd} mcp add --transport http ${s.slug} ${s.transport.url}${headers}`
      } else {
        return `${cmd} mcp add ${s.slug} -- ${s.transport.command} ${s.transport.args.join(' ')}`
      }
    })
    .join(' && \\\n  ')
}

/**
 * Builds JSON config for mcpServers.
 */
export function jsonConfig(servers: McpServer[]): string {
  const entries: Record<string, unknown> = {}
  servers.forEach((s) => {
    if (s.transport.type === 'http') {
      entries[s.slug] = {
        type: 'http',
        url: s.transport.url,
        ...(s.transport.headers ? { headers: s.transport.headers } : {}),
      }
    } else {
      entries[s.slug] = {
        command: s.transport.command,
        args: s.transport.args,
      }
    }
  })
  return JSON.stringify({ mcpServers: entries }, null, 2)
}

/**
 * Builds a Cursor deep link.
 * Format: cursor://anysphere.cursor-deeplink/mcp/install?name=<slug>&config=<base64>
 */
export function cursorLink(server: McpServer): string {
  let config: unknown
  if (server.transport.type === 'http') {
    config = {
      url: server.transport.url,
      ...(server.transport.headers
        ? { headers: server.transport.headers }
        : {}),
    }
  } else {
    config = {
      command: server.transport.command,
      args: server.transport.args,
    }
  }
  const encoded = encodeURIComponent(btoa(JSON.stringify(config)))
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(server.slug)}&config=${encoded}`
}

/**
 * Builds a VS Code deep link that opens Claude Code with the install prompt.
 */
export function vscodeLink(prompt: string): string {
  return `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(prompt)}`
}

/**
 * Builds the full install prompt for one or more servers.
 * Numbers the steps, includes access checks, token steps, verify, write warnings, etc.
 */
export function installPrompt(
  servers: McpServer[],
  ctx: {
    option?: InstallOptionId
    apps: { slug: string; name: string; url: string }[]
    catalogMcpAvailable: boolean
  },
): string {
  const lines: string[] = [
    `Install ${servers.length > 1 ? 'these MCP servers' : 'this MCP server'} for me${ctx.option ? ` in ${ctx.option}` : ''} and check ${servers.length > 1 ? 'they work' : 'it works'}.`,
    '',
  ]

  servers.forEach((s) => {
    lines.push(`- ${s.displayName} (name: ${s.slug})`)
    if (s.transport.type === 'http') {
      lines.push(`  transport: http, url: ${s.transport.url}`)
      if (s.transport.headers) {
        lines.push(
          `  headers: ${Object.keys(s.transport.headers).join(', ')} (the token goes into these headers)`,
        )
      }
    } else {
      lines.push(
        `  transport: stdio, command: ${s.transport.command} ${s.transport.args.join(' ')}`,
      )
    }

    if (s.auth.kind === 'sso') {
      lines.push(
        `  sign-in: SSO. When a browser window opens, tell me to finish the login, then continue.`,
      )
    } else if (s.auth.kind === 'token') {
      const note = s.auth.note ? ` ${s.auth.note}` : ''
      lines.push(`  sign-in: personal token.${note}`)
      if (s.auth.token) {
        lines.push(`  how to get it: ${s.auth.token.steps.join('; ')}.`)
        lines.push(`  page: ${s.auth.token.page}`)
      }
    } else {
      lines.push(`  sign-in: none.`)
    }
  })

  lines.push('', 'Steps:')

  const steps: string[] = []

  // Access check
  const allRequiredSlugs = [
    ...new Set(servers.flatMap((s) => s.requiredAppSlugs || [])),
  ]
  if (allRequiredSlugs.length > 0) {
    const appNames = allRequiredSlugs
      .map((slug) => ctx.apps.find((a) => a.slug === slug))
      .filter((a): a is { slug: string; name: string; url: string } => !!a)
    const appUrls = appNames.map((a) => a.url).join(' , ')
    const names = appNames.map((a) => a.name).join(', ')
    steps.push(
      `Check I can sign in to ${names}. If an account is missing, stop and send me its access-request page: ${appUrls}`,
    )
  }

  // Add servers
  steps.push(
    `Add ${servers.length > 1 ? 'each server' : 'the server'} with your own MCP configuration (user scope, not a project file). If a server with the same name exists, show me the difference and ask before replacing it.`,
  )

  // Token steps
  const tokenServers = servers.filter((s) => s.auth.kind === 'token')
  if (tokenServers.length > 0) {
    const tokenApps = [
      ...new Set(
        tokenServers
          .flatMap((s) => s.requiredAppSlugs || [])
          .map((slug) => ctx.apps.find((a) => a.slug === slug)?.name)
          .filter((n): n is string => !!n),
      ),
    ].join(', ')
    const catalogLine = ctx.catalogMcpAvailable
      ? ` If the App Catalog MCP (app-catalog) is connected, first call get_mcp_server${tokenApps ? ` for ${tokenApps}` : ''} and follow its current access steps where they differ from mine. Otherwise read the authentication section of the docs link.`
      : ' Read the authentication section of the docs link.'
    steps.push(
      `Walk me through getting ${tokenServers.length > 1 ? 'each token, one at a time' : 'the token'}: open the page above for me, tell me exactly which options and scopes to pick, and wait while I create it.${catalogLine}`,
    )
    steps.push(
      `Store each token only in the MCP config (an env value, user scope). Never repeat it in chat and never write it to a file that is committed.`,
    )
  } else {
    steps.push(`Handle sign-in as described above.`)
  }

  // Verify
  const toolCalls = servers
    .map((s) => `${s.slug}.${s.tools[0]?.name}`)
    .join(', ')
  steps.push(
    `Verify: call ${toolCalls} with the smallest possible input and show me one line per server: ok / failed and why.`,
  )

  // Write warning
  const writeServers = servers.filter((s) => s.access === 'write')
  if (writeServers.length > 0) {
    steps.push(
      `${writeServers.map((s) => s.displayName).join(', ')} can change data. Always ask me before calling a tool that writes.`,
    )
  }

  // Sensitive data warning
  const sensitiveServers = servers.filter((s) => s.sensitiveData)
  if (sensitiveServers.length > 0) {
    steps.push(
      `${sensitiveServers.map((s) => s.displayName).join(', ')} can reach production patient data (PHI). Default to non-production environments and never paste patient data into chat unless I ask for a specific case.`,
    )
  }

  steps.forEach((t, i) => lines.push(`${i + 1}. ${t}`))

  return lines.join('\n')
}

/**
 * Builds "What happens?" steps for the chosen install option.
 * Returns {title, detail}[] where title is the step heading and detail is the explanation.
 */
export function whatHappensSteps(
  servers: McpServer[],
  option?: InstallOptionId,
): { title: string; detail: string }[] {
  const one = servers.length === 1
  const names = servers.map((s) => s.slug).join(' ')
  const tokenServers = servers.filter((s) => s.auth.kind === 'token')
  const ssoServers = servers.filter((s) => s.auth.kind === 'sso')

  const steps: { title: string; detail: string }[] = []

  // Starting step
  if (!option) {
    steps.push({
      title: 'Pick your AI above',
      detail: 'The steps below adjust to it.',
    })
  } else if (option === 'claude-vscode') {
    steps.push({
      title: 'VS Code opens Claude Code with a prepared message',
      detail: 'Nothing runs until you read it and press Enter.',
    })
  } else if (option === 'claude-desktop') {
    steps.push({
      title: 'Claude Code desktop opens with a prepared message',
      detail: 'Nothing runs until you press Enter.',
    })
  } else if (option === 'claude-code' || option === 'gemini') {
    steps.push({
      title: 'You paste one command into your terminal',
      detail: 'It only writes the server entry; no AI is involved.',
    })
  } else if (option === 'cursor') {
    if (one) {
      steps.push({
        title: "Cursor shows its 'Install MCP server' dialog",
        detail: 'You click Install there.',
      })
    } else {
      steps.push({
        title: 'You paste the config into Cursor',
        detail: 'Cursor links take one server at a time.',
      })
    }
  } else if (option === 'prompt') {
    steps.push({
      title: 'You paste the prompt into any AI chat',
      detail: 'Your AI does the steps below and asks you at each one.',
    })
  } else {
    // json
    steps.push({
      title: 'You paste the config yourself',
      detail: 'Then fill in the token placeholders.',
    })
  }

  // Access check
  const allRequiredSlugs = [
    ...new Set(servers.flatMap((s) => s.requiredAppSlugs || [])),
  ]
  if (allRequiredSlugs.length > 0) {
    steps.push({
      title: `Checks you can sign in to ${allRequiredSlugs.join(', ')}`,
      detail:
        'If not, it stops and gives you the App Catalog page that says how to request access.',
    })
  }

  // Add to config
  const configFile = option ? CFG_FILE[option] : "your AI's settings"
  const pathNote =
    option && configFile.startsWith('~/') ? ` (${configFile})` : ''
  steps.push({
    title: `Adds ${names} to ${configFile}`,
    detail: `Your user settings${pathNote}, not a repo. An existing entry with the same name is shown to you first.`,
  })

  // Token steps
  tokenServers.forEach((s) => {
    const page = s.auth.token?.page
    const hostNote = page
      ? `Opens ${new URL(page).host} and says which options to pick. `
      : ''
    const headerKey =
      s.transport.type === 'http' && s.transport.headers
        ? Object.keys(s.transport.headers).find((k) =>
            /token|key|secret/i.test(k),
          ) || Object.keys(s.transport.headers)[0]
        : undefined
    steps.push({
      title: `Gets your ${s.displayName} token with you`,
      detail: `${hostNote}You create it; it goes into ${headerKey ? `header ${headerKey}` : 'the server config'}, never into the chat.`,
    })
  })

  // SSO sign-in
  if (ssoServers.length > 0) {
    steps.push({
      title: 'SSO sign-in in your browser',
      detail: `Once, for ${ssoServers.map((s) => s.displayName).join(', ')}.`,
    })
  }

  // Test call
  const testTools = servers
    .slice(0, 3)
    .map((s) => s.tools[0]?.name)
    .filter((t): t is string => !!t)
    .join(' ')
  const extra = servers.length > 3 ? ` +${servers.length - 3} more` : ''
  steps.push({
    title: `Tests ${one ? 'it' : 'each one'} with one small call`,
    detail: `${testTools}${extra}, then reports ok or failed.`,
  })

  // Write warning
  const writeServers = servers.filter((s) => s.access === 'write')
  if (writeServers.length > 0) {
    steps.push({
      title: 'Asks before anything that changes data',
      detail: `${writeServers.map((s) => s.displayName).join(', ')} can write.`,
    })
  }

  // Sensitive data warning
  if (servers.some((s) => s.sensitiveData)) {
    steps.push({
      title: 'Stays on non-production by default',
      detail: 'Production holds patient data.',
    })
  }

  return steps
}
