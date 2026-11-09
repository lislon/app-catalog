import { describe, expect, it } from 'vitest'
import type { McpServer } from '../mcp/mcpServerTypes'
import {
  cliCommand,
  cursorLink,
  installPrompt,
  resolveUrl,
  vscodeLink,
  whatHappensSteps,
} from '../mcp/installBuilders'

function makeServer(
  overrides: Partial<McpServer> & { slug: string },
): McpServer {
  return {
    displayName: overrides.slug,
    description: `Test server ${overrides.slug}`,
    category: 'test',
    status: 'production',
    access: 'read',
    auth: { kind: 'none' },
    transport: { type: 'stdio', command: 'test', args: [] },
    tools: [{ name: 'test_tool', description: 'Test tool' }],
    sources: ['https://example.com/readme'],
    ...overrides,
  }
}

describe('installBuilders', () => {
  describe('cliCommand', () => {
    it('shell quotes unsafe tokens for safety', () => {
      const server = makeServer({
        slug: 'gitlab',
        transport: {
          type: 'http',
          url: 'https://h/gitlab/mcp',
          headers: { api_key: '<GITLAB_API_TOKEN>' },
        },
      })
      const cmd = cliCommand('claude-code', [server])
      // Safe URL passes through bare, header value is quoted
      expect(cmd).toBe(
        "claude mcp add --transport http gitlab https://h/gitlab/mcp -H 'api_key: <GITLAB_API_TOKEN>'",
      )
    })

    it('$() header value stays inert', () => {
      const server = makeServer({
        slug: 'gitlab',
        transport: {
          type: 'http',
          url: 'https://h/mcp',
          headers: { api_key: '<$(echo INJECTED)>' },
        },
      })
      const cmd = cliCommand('claude-code', [server])
      expect(cmd).toContain("'api_key: <$(echo INJECTED)>'")
    })

    it('backtick header value stays inert', () => {
      const server = makeServer({
        slug: 'test',
        transport: {
          type: 'http',
          url: 'https://h/mcp',
          headers: { key: '`whoami`' },
        },
      })
      const cmd = cliCommand('claude-code', [server])
      expect(cmd).toContain("'key: `whoami`'")
    })

    it('URL containing & is quoted', () => {
      const server = makeServer({
        slug: 'test',
        transport: { type: 'http', url: 'https://h/mcp?a=1&b=2' },
      })
      const cmd = cliCommand('claude-code', [server])
      expect(cmd).toContain("'https://h/mcp?a=1&b=2'")
    })

    it('stdio arg with space is quoted', () => {
      const server = makeServer({
        slug: 'test',
        transport: {
          type: 'stdio',
          command: 'python',
          args: ['my script.py'],
        },
      })
      const cmd = cliCommand('claude-code', [server])
      expect(cmd).toContain("'my script.py'")
    })

    it('safe tokens pass through bare', () => {
      const server = makeServer({
        slug: 'mailhog',
        transport: { type: 'stdio', command: 'uvx', args: ['mailhog-mcp'] },
      })
      const cmd = cliCommand('claude-code', [server])
      expect(cmd).toBe('claude mcp add mailhog -- uvx mailhog-mcp')
    })
  })

  describe('resolveUrl', () => {
    it('keeps absolute, prefixes relative', () => {
      const server = makeServer({
        slug: 'test',
        transport: { type: 'http', url: '/api/mcp' },
      })
      const resolved = resolveUrl(server, 'https://slot1.example')
      if (resolved.transport.type !== 'http') throw new Error('Not http')
      expect(resolved.transport).toEqual({
        type: 'http',
        url: 'https://slot1.example/api/mcp',
      })
    })

    it('keeps absolute url unchanged', () => {
      const server = makeServer({
        slug: 'test',
        transport: { type: 'http', url: 'https://absolute.com/mcp' },
      })
      const resolved = resolveUrl(server, 'https://slot1.example')
      expect(resolved.transport).toEqual({
        type: 'http',
        url: 'https://absolute.com/mcp',
      })
    })

    it('does not modify stdio', () => {
      const server = makeServer({
        slug: 'test',
        transport: { type: 'stdio', command: 'test', args: ['arg'] },
      })
      const resolved = resolveUrl(server, 'https://slot1.example')
      expect(resolved.transport).toEqual({
        type: 'stdio',
        command: 'test',
        args: ['arg'],
      })
    })
  })

  describe('cursorLink', () => {
    it('config base64-decodes to {url, headers}', () => {
      const server = makeServer({
        slug: 'gitlab',
        transport: {
          type: 'http',
          url: 'https://h/gitlab/mcp',
          headers: { api_key: '<GITLAB_API_TOKEN>' },
        },
      })
      const link = cursorLink(server)
      const match = link.match(/config=([^&]+)/)
      expect(match).toBeTruthy()
      const encodedConfig = match?.[1]
      if (!encodedConfig) throw new Error('match is null')
      const config = JSON.parse(atob(decodeURIComponent(encodedConfig)))
      expect(config).toEqual({
        url: 'https://h/gitlab/mcp',
        headers: { api_key: '<GITLAB_API_TOKEN>' },
      })
    })

    it('Cyrillic placeholder round-trips', () => {
      const server = makeServer({
        slug: 'test',
        transport: {
          type: 'http',
          url: 'https://h/mcp',
          headers: { key: '<ТОКЕН>' },
        },
      })
      const link = cursorLink(server)
      const match = link.match(/config=([^&]+)/)
      expect(match).toBeTruthy()
      const encodedConfig = match?.[1]
      if (!encodedConfig) throw new Error('match is null')
      // Decode: URL decode, then base64, then parse JSON (browser)
      const base64 = decodeURIComponent(encodedConfig)
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const json = new TextDecoder().decode(bytes)
      const config = JSON.parse(json)
      expect(config.headers.key).toBe('<ТОКЕН>')
    })
  })

  describe('vscodeLink', () => {
    it('starts with vscode://anthropic.claude-code/open?prompt= and round-trips the prompt', () => {
      const prompt = 'Install this MCP server for me'
      const link = vscodeLink(prompt)
      expect(link).toMatch(/^vscode:\/\/anthropic\.claude-code\/open\?prompt=/)
      const match = link.match(/prompt=(.+)/)
      expect(match).toBeTruthy()
      const encodedPrompt = match?.[1]
      if (!encodedPrompt) throw new Error('match is null')
      const decoded = decodeURIComponent(encodedPrompt)
      expect(decoded).toBe(prompt)
    })
  })

  describe('installPrompt', () => {
    it('numbers steps consecutively starting at 1', () => {
      const server = makeServer({
        slug: 'test',
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      const steps = prompt.match(/^\d+\. /gm)
      expect(steps).toBeTruthy()
      if (!steps) throw new Error('No steps found')
      expect(steps.length).toBeGreaterThan(0)
      steps.forEach((step, i) => {
        expect(step).toBe(`${i + 1}. `)
      })
    })

    it('includes access check with each app URL', () => {
      const server = makeServer({
        slug: 'gitlab',
        requiredAppSlugs: ['gitlab'],
        transport: { type: 'http', url: 'https://h/gitlab/mcp' },
        auth: { kind: 'none' },
      })
      const apps = [
        {
          slug: 'gitlab',
          name: 'GitLab',
          url: 'https://app-catalog.example/app/gitlab',
        },
      ]
      const prompt = installPrompt([server], {
        apps,
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('GitLab')
      const firstApp = apps[0]
      if (!firstApp) throw new Error('No app')
      expect(prompt).toContain(firstApp.url)
    })

    it('omits access check when no apps resolve', () => {
      const server = makeServer({
        slug: 'test',
        requiredAppSlugs: ['nonexistent'],
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).not.toContain('Check I can sign in')
    })

    it('includes token steps and page', () => {
      const server = makeServer({
        slug: 'gitlab',
        auth: {
          kind: 'token',
          note: 'Personal token',
          token: {
            page: 'https://gitlab.example/tokens',
            steps: [
              'Open Access tokens',
              'Add new token: scope read_api',
              'Copy the glpat- value',
            ],
          },
        },
        transport: {
          type: 'http',
          url: 'https://h/mcp',
          headers: { api_key: '<GITLAB_API_TOKEN>' },
        },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('Open Access tokens')
      expect(prompt).toContain('https://gitlab.example/tokens')
    })

    it('includes "Store each token only in the MCP config"', () => {
      const server = makeServer({
        slug: 'gitlab',
        auth: {
          kind: 'token',
          token: {
            page: 'https://gitlab.example/tokens',
            steps: ['Get token'],
          },
        },
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('Store each token only in the MCP config')
    })

    it('says "its headers (http) or env (stdio)" for mixed transports', () => {
      const servers = [
        makeServer({
          slug: 'http-server',
          auth: {
            kind: 'token',
            token: { page: 'https://h/tokens', steps: ['Get token'] },
          },
          transport: { type: 'http', url: 'https://h/mcp' },
        }),
        makeServer({
          slug: 'stdio-server',
          auth: {
            kind: 'token',
            token: { page: 'https://h/tokens', steps: ['Get token'] },
          },
          transport: { type: 'stdio', command: 'cmd', args: [] },
        }),
      ]
      const prompt = installPrompt(servers, {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('its headers (http) or env (stdio)')
    })

    it('includes get_mcp_server as first step when available', () => {
      const server = makeServer({
        slug: 'gitlab',
        requiredAppSlugs: ['gitlab'],
        auth: {
          kind: 'token',
          token: {
            page: 'https://gitlab.example/tokens',
            steps: ['Get token'],
          },
        },
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [{ slug: 'gitlab', name: 'GitLab', url: 'https://h/app/gitlab' }],
        catalogMcpAvailable: true,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('get_mcp_server')
      // Should be first step
      const lines = prompt.split('\n')
      const firstStep = lines.find((l) => l.startsWith('1. '))
      expect(firstStep).toContain('get_mcp_server')
    })

    it('includes get_mcp_server exactly once', () => {
      const server = makeServer({
        slug: 'gitlab',
        requiredAppSlugs: ['gitlab'],
        auth: {
          kind: 'token',
          token: {
            page: 'https://gitlab.example/tokens',
            steps: ['Get token'],
          },
        },
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [{ slug: 'gitlab', name: 'GitLab', url: 'https://h/app/gitlab' }],
        catalogMcpAvailable: true,
        sensitiveDataLabel: 'Sensitive data',
      })
      const matches = prompt.match(/get_mcp_server/g)
      expect(matches?.length).toBe(1)
    })

    it('includes get_mcp_server for server with no requiredAppSlugs', () => {
      const server = makeServer({
        slug: 'test',
        auth: { kind: 'none' },
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: true,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('get_mcp_server')
      const lines = prompt.split('\n')
      const firstStep = lines.find((l) => l.startsWith('1. '))
      expect(firstStep).toContain('get_mcp_server')
    })

    it('omits get_mcp_server when flag is false', () => {
      const server = makeServer({
        slug: 'gitlab',
        requiredAppSlugs: ['gitlab'],
        auth: { kind: 'sso' },
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [{ slug: 'gitlab', name: 'GitLab', url: 'https://h/app/gitlab' }],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).not.toContain('get_mcp_server')
    })

    it('includes verify call on tools[0].name', () => {
      const server = makeServer({
        slug: 'gitlab',
        tools: [{ name: 'get_repos', description: 'List repos' }],
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('get_repos')
    })

    it('skips verify for server with no tools', () => {
      const server = makeServer({
        slug: 'no-tools',
        tools: [],
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).not.toContain('Verify:')
    })

    it('includes ask-before-write line only when access === "write"', () => {
      const writeServer = makeServer({
        slug: 'gitlab',
        access: 'write',
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const readServer = makeServer({
        slug: 'gitlab',
        access: 'read',
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const writePrompt = installPrompt([writeServer], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      const readPrompt = installPrompt([readServer], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(writePrompt.toLowerCase()).toMatch(/ask.*before.*call.*tool.*writ/)
      expect(readPrompt.toLowerCase()).not.toMatch(
        /ask.*before.*call.*tool.*writ/,
      )
    })

    it('uses sensitiveDataLabel exactly as given', () => {
      const sensitiveServer = makeServer({
        slug: 'lims',
        sensitiveData: true,
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([sensitiveServer], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Customer records',
      })
      expect(prompt).toContain('Customer records')
    })

    it('preserves label case (acronyms stay intact)', () => {
      const sensitiveServer = makeServer({
        slug: 'lims',
        sensitiveData: true,
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([sensitiveServer], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'PII',
      })
      expect(prompt).toContain('PII')
      expect(prompt).not.toContain('pii')
    })

    it('includes sources URLs', () => {
      const server = makeServer({
        slug: 'gitlab',
        sources: [
          'https://gitlab.example/readme',
          'https://docs.example/gitlab',
        ],
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('sources: https://gitlab.example/readme')
      expect(prompt).toContain('https://docs.example/gitlab')
    })

    it('prints the URL of a source read back as an object', () => {
      const server = {
        ...makeServer({ slug: 'gitlab' }),
        sources: [
          { url: 'https://gitlab.example/readme', sourceSlug: 'gitlab' },
          'https://docs.example/gitlab',
        ],
      }
      const prompt = installPrompt([server], {
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain(
        'sources: https://gitlab.example/readme, https://docs.example/gitlab',
      )
      expect(prompt).not.toContain('[object Object]')
    })

    it('uses human label instead of option ID', () => {
      const server = makeServer({
        slug: 'test',
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const prompt = installPrompt([server], {
        option: 'claude-vscode',
        apps: [],
        catalogMcpAvailable: false,
        sensitiveDataLabel: 'Sensitive data',
      })
      expect(prompt).toContain('Claude Code in VS Code')
      expect(prompt).not.toContain('claude-vscode')
    })
  })

  describe('whatHappensSteps', () => {
    it('cursor: exact wording for multi-server', () => {
      const servers = [
        makeServer({
          slug: 'gitlab',
          transport: { type: 'http', url: 'https://h/mcp' },
        }),
        makeServer({
          slug: 'mailhog',
          transport: { type: 'stdio', command: 'uvx', args: ['mailhog-mcp'] },
        }),
      ]
      const steps = whatHappensSteps(servers, 'cursor')
      const firstStep = steps[0]
      if (!firstStep) throw new Error('No first step')
      expect(firstStep.title).toBe('You paste the config into Cursor')
      expect(firstStep.detail).toBe('Cursor links take one server at a time.')
    })

    it('includes config file per option', () => {
      const server = makeServer({
        slug: 'gitlab',
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const claudeCodeSteps = whatHappensSteps([server], 'claude-code')
      const cursorSteps = whatHappensSteps([server], 'cursor')
      const geminiSteps = whatHappensSteps([server], 'gemini')

      const addStep = (steps: { title: string; detail: string }[]) =>
        steps.find((s) => s.title.toLowerCase().includes('add')) ||
        steps.find((s) => s.detail.toLowerCase().includes('~/.'))

      expect(addStep(claudeCodeSteps)?.detail).toContain('~/.claude.json')
      expect(addStep(cursorSteps)?.detail).toContain('~/.cursor/mcp.json')
      expect(addStep(geminiSteps)?.detail).toContain('~/.gemini/settings.json')
    })

    it('shows app names when provided', () => {
      const server = makeServer({
        slug: 'gitlab',
        requiredAppSlugs: ['gitlab'],
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const steps = whatHappensSteps([server], 'claude-vscode', {
        apps: [{ slug: 'gitlab', name: 'GitLab' }],
      })
      const accessStep = steps.find((s) =>
        s.title.toLowerCase().includes('sign in'),
      )
      expect(accessStep?.title).toContain('GitLab')
      expect(accessStep?.title).not.toContain('gitlab')
    })

    // One server that exercises every step: needs an app, a token in a
    // header, writes, touches sensitive data, has a tool to test with.
    const full = makeServer({
      slug: 'wiki',
      displayName: 'Wiki',
      access: 'write',
      sensitiveData: true,
      requiredAppSlugs: ['wiki-app'],
      auth: {
        kind: 'token',
        token: {
          page: 'https://wiki.example.com/tokens',
          steps: ['Open Settings', 'Generate a token'],
        },
      },
      transport: {
        type: 'http',
        url: 'https://h/mcp',
        headers: { 'X-API-Key': '<WIKI_TOKEN>' },
      },
      tools: [{ name: 'search_pages', description: 'Search' }],
    })
    const apps = [{ slug: 'wiki-app', name: 'Wiki App' }]
    const lines = (option: Parameters<typeof whatHappensSteps>[1]) =>
      whatHappensSteps([full], option, { apps }).map(
        (s) => `${s.title} | ${s.detail}`,
      )

    it('terminal options: no AI, so you replace the token and test it yourself', () => {
      const terminal = [
        'You paste one command into your terminal | It only writes the server entry; no AI is involved.',
        "You need an account in Wiki App | Without one the server cannot sign in; the app's App Catalog page says how to request access.",
        'Adds wiki to ~/.claude.json | Your user settings (~/.claude.json), not a repo.',
        'Replace <WIKI_TOKEN> in the command with your token from wiki.example.com | Open Settings; Generate a token. It stays in your user settings; never paste it into a chat.',
        'Ask your AI to call search_pages to check it works | Installing makes no test call of its own.',
        "Some tools change data | Wiki can write; your AI client's approval settings decide whether it asks first.",
        'Prefer non-production | Production holds sensitive data — prefer non-production environments when you use it.',
      ]
      expect(lines('claude-code')).toEqual(terminal)
      expect(lines('gemini')).toEqual(
        terminal.map((l) =>
          l.replaceAll('~/.claude.json', '~/.gemini/settings.json'),
        ),
      )
    })

    it('AI-driven options: the AI checks access, helps with the token and tests', () => {
      const guided = [
        'Checks you can sign in to Wiki App | If not, it stops and gives you the App Catalog page that says how to request access.',
        'Adds wiki to ~/.claude.json | Your user settings (~/.claude.json), not a repo. An existing entry with the same name is shown to you first.',
        'Helps you create your Wiki token | Opens wiki.example.com and says which options to pick. You create it; it goes into header X-API-Key, never into the chat.',
        'Tests it with one small call | search_pages, then reports ok or failed.',
        'Asks before anything that changes data | Wiki can write.',
        'Stays on non-production by default | Production holds sensitive data, so your AI asks before touching it.',
      ]
      expect(lines('claude-vscode')).toEqual([
        'VS Code opens Claude Code with a prepared message | Nothing runs until you read it and press Enter.',
        ...guided,
      ])
      expect(lines('prompt')).toEqual([
        'You paste the prompt into any AI chat | Your AI does the steps below and asks you at each one.',
        ...guided.map((l) =>
          l.replaceAll(
            '~/.claude.json | Your user settings (~/.claude.json)',
            "your AI's own MCP settings | Your user settings",
          ),
        ),
      ])
    })

    it("cursor: Cursor's dialog adds it, then you replace the token in the config", () => {
      expect(lines('cursor').slice(0, 4)).toEqual([
        "Cursor shows its 'Install MCP server' dialog | You click Install there, and Cursor adds the server.",
        "You need an account in Wiki App | Without one the server cannot sign in; the app's App Catalog page says how to request access.",
        'Adds wiki to ~/.cursor/mcp.json | Your user settings (~/.cursor/mcp.json), not a repo.',
        'Replace <WIKI_TOKEN> in the config with your token from wiki.example.com | Open Settings; Generate a token. It stays in your user settings; never paste it into a chat.',
      ])
    })

    it('json: you paste the config, then replace the placeholders', () => {
      expect(lines('json').slice(0, 3)).toEqual([
        "You paste the config yourself | Under mcpServers in your client's MCP config.",
        "You need an account in Wiki App | Without one the server cannot sign in; the app's App Catalog page says how to request access.",
        'Replace <WIKI_TOKEN> in the config with your token from wiki.example.com | Open Settings; Generate a token. It stays in your user settings; never paste it into a chat.',
      ])
    })

    it('SSO: your usual company sign-in, with no "once" promise', () => {
      const sso = makeServer({
        slug: 'logs',
        displayName: 'Logs',
        auth: { kind: 'sso' },
      })
      expect(
        whatHappensSteps([sso], 'claude-code').find((s) =>
          s.title.includes('SSO'),
        ),
      ).toEqual({
        title: 'SSO sign-in in your browser',
        detail: 'For Logs, your usual company sign-in.',
      })
    })

    it('guards against malformed token page URL', () => {
      const server = makeServer({
        slug: 'test',
        auth: {
          kind: 'token',
          token: { page: 'not-a-valid-url', steps: ['Get token'] },
        },
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      expect(() => whatHappensSteps([server], 'claude-code')).not.toThrow()
    })

    it('skips test step for servers with no tools', () => {
      const server = makeServer({
        slug: 'no-tools',
        tools: [],
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const steps = whatHappensSteps([server], 'claude-code')
      const testStep = steps.find((s) => s.title.toLowerCase().includes('test'))
      expect(testStep).toBeUndefined()
    })
  })
})
