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
    it('quotes header values', () => {
      const server = makeServer({
        slug: 'gitlab',
        transport: {
          type: 'http',
          url: 'https://h/gitlab/mcp',
          headers: { api_key: '<GITLAB TOKEN "x">' },
        },
      })
      const cmd = cliCommand('claude-code', [server])
      expect(cmd).toContain(
        'claude mcp add --transport http gitlab https://h/gitlab/mcp -H "api_key: <GITLAB TOKEN \\"x\\">"',
      )
    })

    it('claude-code http', () => {
      const server = makeServer({
        slug: 'gitlab',
        transport: {
          type: 'http',
          url: 'https://h/gitlab/mcp',
          headers: { api_key: '<GITLAB_API_TOKEN>' },
        },
      })
      const cmd = cliCommand('claude-code', [server])
      expect(cmd).toBe(
        'claude mcp add --transport http gitlab https://h/gitlab/mcp -H "api_key: <GITLAB_API_TOKEN>"',
      )
    })

    it('stdio', () => {
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
    it('numbers steps and includes access check with each app URL', () => {
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
      })
      expect(prompt).toContain('1.')
      expect(prompt).toContain('2.')
      expect(prompt).toContain('GitLab')
      const firstApp = apps[0]
      if (!firstApp) throw new Error('No app')
      expect(prompt).toContain(firstApp.url)
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
      })
      expect(prompt).toContain('Store each token only in the MCP config')
    })

    it('includes "call get_mcp_server" when catalogMcpAvailable is set', () => {
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
      })
      expect(prompt).toContain('get_mcp_server')
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
      })
      expect(prompt).toContain('get_repos')
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
      })
      const readPrompt = installPrompt([readServer], {
        apps: [],
        catalogMcpAvailable: false,
      })
      expect(writePrompt.toLowerCase()).toMatch(/ask.*before.*call.*tool.*writ/)
      expect(readPrompt.toLowerCase()).not.toMatch(
        /ask.*before.*call.*tool.*writ/,
      )
    })

    it('includes sensitive-data line only when sensitiveData is set', () => {
      const sensitiveServer = makeServer({
        slug: 'lims',
        sensitiveData: true,
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const regularServer = makeServer({
        slug: 'gitlab',
        sensitiveData: false,
        transport: { type: 'http', url: 'https://h/mcp' },
      })
      const sensitivePrompt = installPrompt([sensitiveServer], {
        apps: [],
        catalogMcpAvailable: false,
      })
      const regularPrompt = installPrompt([regularServer], {
        apps: [],
        catalogMcpAvailable: false,
      })
      expect(sensitivePrompt.toLowerCase()).toMatch(
        /patient.*data|sensitive.*data|phi/,
      )
      expect(regularPrompt.toLowerCase()).not.toMatch(
        /patient.*data|sensitive.*data|phi/,
      )
    })
  })

  describe('whatHappensSteps', () => {
    it('cursor: first step says Cursor links take one server and the config is pasted', () => {
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
      expect(firstStep.title.toLowerCase()).toMatch(/cursor|paste/)
      expect(firstStep.detail.toLowerCase()).toMatch(/one server/)
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
  })
})
