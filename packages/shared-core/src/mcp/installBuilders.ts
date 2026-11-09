/**
 * Pure functions that build install commands, deep links, JSON config,
 * the install prompt and "What happens?" steps for MCP servers.
 * Used by both frontend-core and company-side MCP tools.
 * Never reads window — always takes inputs explicitly.
 */

import type { InstallableMcpServer } from './mcpServerTypes'

export type InstallOptionId =
  | 'claude-vscode'
  | 'claude-code'
  | 'claude-desktop'
  | 'cursor'
  | 'gemini'
  | 'prompt'
  | 'json'

/** The file each option writes the server entry to. */
export const INSTALL_CONFIG_FILE: Record<InstallOptionId, string> = {
  'claude-vscode': '~/.claude.json',
  'claude-code': '~/.claude.json',
  'claude-desktop': '~/.claude.json',
  cursor: '~/.cursor/mcp.json',
  gemini: '~/.gemini/settings.json',
  prompt: "your AI's own MCP settings",
  json: 'the config file you paste into',
}

const INSTALL_OPTION_LABELS: Record<InstallOptionId, string> = {
  'claude-vscode': 'Claude Code in VS Code',
  'claude-code': 'Claude Code in terminal',
  'claude-desktop': 'Claude Code desktop',
  cursor: 'Cursor',
  gemini: 'Gemini CLI',
  prompt: 'any AI chat',
  json: 'your MCP config',
}

/**
 * POSIX shell quote: wraps unsafe strings in single quotes.
 * Safe tokens (alphanumeric + limited punctuation) pass through bare.
 */
function shq(s: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(s)) return s
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

/**
 * Makes a relative `transport.url` absolute.
 * HTTP transport: prefixes relative URLs with origin.
 * Stdio transport: unchanged.
 */
export function resolveUrl<T extends InstallableMcpServer>(
  server: T,
  origin: string,
): T {
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
 * All tokens are shell-quoted for safety.
 */
export function cliCommand(
  option: 'claude-code' | 'gemini',
  servers: InstallableMcpServer[],
): string {
  const cmd = option === 'claude-code' ? 'claude' : 'gemini'
  return servers
    .map((s) => {
      if (s.transport.type === 'http') {
        const headers = s.transport.headers
          ? Object.entries(s.transport.headers)
              .map(([k, v]) => ` -H ${shq(`${k}: ${v}`)}`)
              .join('')
          : ''
        return `${cmd} mcp add --transport http ${shq(s.slug)} ${shq(s.transport.url)}${headers}`
      } else {
        const args = s.transport.args.map(shq).join(' ')
        return `${cmd} mcp add ${shq(s.slug)} -- ${shq(s.transport.command)} ${args}`
      }
    })
    .join(' && \\\n  ')
}

/**
 * Builds JSON config for mcpServers.
 */
export function jsonConfig(servers: InstallableMcpServer[]): string {
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
 * Handles UTF-8 text safely (not just Latin-1).
 */
export function cursorLink(server: InstallableMcpServer): string {
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
  const json = JSON.stringify(config)
  // UTF-8 safe base64: encode to bytes first (browser)
  const bytes = new TextEncoder().encode(json)
  const base64 = btoa(String.fromCharCode(...bytes))
  const encoded = encodeURIComponent(base64)
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
  servers: InstallableMcpServer[],
  ctx: {
    option?: InstallOptionId
    apps: { slug: string; name: string; url: string }[]
    catalogMcpAvailable: boolean
    sensitiveDataLabel: string
  },
): string {
  const optionLabel = ctx.option ? INSTALL_OPTION_LABELS[ctx.option] : undefined
  const lines: string[] = [
    `Install ${servers.length > 1 ? 'these MCP servers' : 'this MCP server'} for me${optionLabel ? ` in ${optionLabel}` : ''} and check ${servers.length > 1 ? 'they work' : 'it works'}.`,
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

    if (s.sources.length > 0) {
      const urls = s.sources.map((src) =>
        typeof src === 'string' ? src : src.url,
      )
      lines.push(`  sources: ${urls.join(', ')}`)
    }
  })

  lines.push('', 'Steps:')

  const steps: string[] = []

  // get_mcp_server and access check (first step when catalog available)
  if (ctx.catalogMcpAvailable) {
    const allRequiredSlugs = [
      ...new Set(servers.flatMap((s) => s.requiredAppSlugs || [])),
    ]
    const appNames = allRequiredSlugs
      .map((slug) => ctx.apps.find((a) => a.slug === slug))
      .filter((a): a is { slug: string; name: string; url: string } => !!a)

    if (appNames.length > 0) {
      const names = appNames.map((a) => a.name).join(', ')
      const appUrls = appNames.map((a) => a.url).join(', ')
      steps.push(
        `If the App Catalog MCP (app-catalog) is connected, call get_mcp_server for ${names} to get the latest access steps and check I can sign in. If an account is missing, stop and send me its access-request page: ${appUrls}`,
      )
    } else {
      steps.push(
        `If the App Catalog MCP (app-catalog) is connected, call get_mcp_server to get the latest access steps.`,
      )
    }
  } else {
    // Access check without catalog
    const allRequiredSlugs = [
      ...new Set(servers.flatMap((s) => s.requiredAppSlugs || [])),
    ]
    if (allRequiredSlugs.length > 0) {
      const appNames = allRequiredSlugs
        .map((slug) => ctx.apps.find((a) => a.slug === slug))
        .filter((a): a is { slug: string; name: string; url: string } => !!a)
      if (appNames.length > 0) {
        const appUrls = appNames.map((a) => a.url).join(', ')
        const names = appNames.map((a) => a.name).join(', ')
        steps.push(
          `Check I can sign in to ${names}. If an account is missing, stop and send me its access-request page: ${appUrls}`,
        )
      }
    }
  }

  // Add servers
  steps.push(
    `Add ${servers.length > 1 ? 'each server' : 'the server'} with your own MCP configuration (user scope, not a project file). If a server with the same name exists, show me the difference and ask before replacing it.`,
  )

  // Token steps
  const tokenServers = servers.filter((s) => s.auth.kind === 'token')
  if (tokenServers.length > 0) {
    const catalogLine = ctx.catalogMcpAvailable
      ? ' Follow the latest access steps where they differ from the sources listed above. Otherwise read the authentication section from those sources.'
      : ' Read the authentication section from the sources listed above.'
    steps.push(
      `Walk me through getting ${tokenServers.length > 1 ? 'each token, one at a time' : 'the token'}: open the page above for me, tell me exactly which options and scopes to pick, and wait while I create it.${catalogLine}`,
    )
    const httpServers = tokenServers.filter((s) => s.transport.type === 'http')
    const stdioServers = tokenServers.filter(
      (s) => s.transport.type === 'stdio',
    )
    const storageNote =
      httpServers.length > 0 && stdioServers.length > 0
        ? 'its headers (http) or env (stdio)'
        : httpServers.length > 0
          ? 'its headers'
          : 'env'
    steps.push(
      `Store each token only in the MCP config (${storageNote}, user scope). Never repeat it in chat and never write it to a file that is committed.`,
    )
  } else {
    steps.push(`Handle sign-in as described above.`)
  }

  // Verify
  const serversWithTools = servers.filter((s) => s.tools.length > 0)
  if (serversWithTools.length > 0) {
    const toolCalls = serversWithTools
      .map((s) => `${s.slug}.${s.tools[0]?.name}`)
      .join(', ')
    steps.push(
      `Verify: call ${toolCalls} with the smallest possible input and show me one line per server: ok / failed and why.`,
    )
  }

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
      `${sensitiveServers.map((s) => s.displayName).join(', ')} touches ${ctx.sensitiveDataLabel}. Default to non-production environments and never paste sensitive data into chat unless I ask for a specific case.`,
    )
  }

  steps.forEach((t, i) => lines.push(`${i + 1}. ${t}`))

  return lines.join('\n')
}

/** Options where an AI reads the prompt and does the steps with you. */
const AI_DRIVEN: ReadonlySet<InstallOptionId | undefined> = new Set([
  undefined,
  'claude-vscode',
  'claude-desktop',
  'prompt',
])

/** The host of a token page, or the page itself when it is not a URL. */
function hostOf(page: string): string {
  try {
    return new URL(page).host
  } catch {
    return page
  }
}

/** Extracts all <UPPERCASE_NAME> placeholders from a string. */
function extractPlaceholders(value: string): string[] {
  const matches = value.match(/<[A-Z][A-Z0-9_]*>/g)
  return matches || []
}

/** The header a token goes into: the one named like a token, else the first. */
function tokenHeader(
  s: InstallableMcpServer,
): { name: string; value: string; placeholders: string[] } | undefined {
  if (s.transport.type !== 'http' || !s.transport.headers) return undefined
  const headers = s.transport.headers
  const name =
    Object.keys(headers).find((k) => /token|key|secret|auth/i.test(k)) ??
    Object.keys(headers)[0]
  if (!name) return undefined
  const value = headers[name] ?? ''
  return { name, value, placeholders: extractPlaceholders(value) }
}

/**
 * Builds "What happens?" steps for the chosen install option: only what that
 * option really does. With an AI (VS Code, desktop, a pasted prompt, or no
 * choice yet) the AI walks you through access, the token and a test call. A
 * terminal command, Cursor's dialog or pasted JSON involves no AI: you fill
 * in the token yourself and nothing tests the server for you.
 * Returns {title, detail}[] where title is the step heading and detail is the explanation.
 */
export function whatHappensSteps(
  servers: InstallableMcpServer[],
  option?: InstallOptionId,
  opts?: {
    apps?: { slug: string; name: string }[]
  },
): { title: string; detail: string }[] {
  const apps = opts?.apps || []
  const ai = AI_DRIVEN.has(option)
  const one = servers.length === 1
  const names = servers.map((s) => s.slug).join(' ')
  const tokenServers = servers.filter((s) => s.auth.kind === 'token')
  const ssoServers = servers.filter((s) => s.auth.kind === 'sso')
  const pasted = option === 'json' || (option === 'cursor' && !one)

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
        detail: 'You click Install there, and Cursor adds the server.',
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
      detail: "Under mcpServers in your client's MCP config.",
    })
  }

  // Access check: the AI checks it; otherwise it is on you.
  const allRequiredSlugs = [
    ...new Set(servers.flatMap((s) => s.requiredAppSlugs || [])),
  ]
  if (allRequiredSlugs.length > 0) {
    const appNames = allRequiredSlugs
      .map((slug) => apps.find((a) => a.slug === slug)?.name || slug)
      .join(', ')
    steps.push(
      ai
        ? {
            title: `Checks you can sign in to ${appNames}`,
            detail:
              'If not, it stops and gives you the App Catalog page that says how to request access.',
          }
        : {
            title: `You need an account in ${appNames}`,
            detail:
              "Without one the server cannot sign in; the app's App Catalog page says how to request access.",
          },
    )
  }

  // Add to config. Pasted JSON names no file of its own: the paste is the add.
  if (!pasted) {
    const configFile = option
      ? INSTALL_CONFIG_FILE[option]
      : "your AI's settings"
    const pathNote =
      option && configFile.startsWith('~/') ? ` (${configFile})` : ''
    steps.push({
      title: `Adds ${names} to ${configFile}`,
      detail: ai
        ? `Your user settings${pathNote}, not a repo. An existing entry with the same name is shown to you first.`
        : `Your user settings${pathNote}, not a repo.`,
    })
  }

  // Token steps
  tokenServers.forEach((s) => {
    const page = s.auth.token?.page
    const header = tokenHeader(s)
    if (ai) {
      steps.push({
        title: `Helps you create your ${s.displayName} token`,
        detail: `${page ? `Opens ${hostOf(page)} and says which options to pick. ` : ''}You create it; it goes into ${header ? `header ${header.name}` : 'the server config'}, never into the chat.`,
      })
      return
    }
    const where =
      option === 'claude-code' || option === 'gemini'
        ? 'the command'
        : 'the config'
    const from = page ? ` from ${hostOf(page)}` : ''
    const tokenSteps = s.auth.token?.steps ?? []
    let title: string
    if (header) {
      // If value is exactly one placeholder, say "Replace <TOKEN>"
      // Otherwise show the pattern: "In <USERNAME>@example.com, replace <USERNAME>"
      const isWholePlaceholder =
        header.placeholders.length === 1 &&
        header.value === header.placeholders[0]
      if (isWholePlaceholder) {
        title = `Replace ${header.value} in ${where} with your token${from}`
      } else {
        const ph = header.placeholders[0] || '<TOKEN>'
        title = `In ${header.value}, replace ${ph} with your token${from}`
      }
    } else {
      title = `Add your ${s.displayName} token to ${where}${from}`
    }
    steps.push({
      title,
      detail: `${tokenSteps.length > 0 ? `${tokenSteps.join('; ')}. ` : ''}It stays in your user settings; never paste it into a chat.`,
    })
  })

  // SSO sign-in
  if (ssoServers.length > 0) {
    steps.push({
      title: 'SSO sign-in in your browser',
      detail: `For ${ssoServers.map((s) => s.displayName).join(', ')}, your usual company sign-in.`,
    })
  }

  // Test call: the AI makes one; a manual install makes none.
  const serversWithTools = servers.filter((s) => s.tools.length > 0)
  if (serversWithTools.length > 0) {
    const testTools = serversWithTools
      .slice(0, 3)
      .map((s) => s.tools[0]?.name)
      .filter((t): t is string => !!t)
      .join(' ')
    const extra =
      serversWithTools.length > 3 ? ` +${serversWithTools.length - 3} more` : ''
    steps.push(
      ai
        ? {
            title: `Tests ${one ? 'it' : 'each one'} with one small call`,
            detail: `${testTools}${extra}, then reports ok or failed.`,
          }
        : {
            title: `Ask your AI to call ${testTools}${extra} to check it works`,
            detail: 'Installing makes no test call of its own.',
          },
    )
  }

  // Write warning
  const writeServers = servers.filter((s) => s.access === 'write')
  if (writeServers.length > 0) {
    const writers = writeServers.map((s) => s.displayName).join(', ')
    steps.push(
      ai
        ? {
            title: 'Asks before anything that changes data',
            detail: `${writers} can write.`,
          }
        : {
            title: 'Some tools change data',
            detail: `${writers} can write; your AI client's approval settings decide whether it asks first.`,
          },
    )
  }

  // Sensitive data warning
  if (servers.some((s) => s.sensitiveData)) {
    steps.push(
      ai
        ? {
            title: 'Stays on non-production by default',
            detail:
              'Production holds sensitive data, so your AI asks before touching it.',
          }
        : {
            title: 'Prefer non-production',
            detail:
              'Production holds sensitive data — prefer non-production environments when you use it.',
          },
    )
  }

  return steps
}
