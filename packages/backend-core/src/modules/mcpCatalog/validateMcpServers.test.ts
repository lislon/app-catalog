import { describe, expect, it } from 'vitest'
import type { McpServer } from '@igstack/app-catalog-shared-core'
import { validateMcpServers } from './validateMcpServers'

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

describe('validateMcpServers', () => {
  const known = {
    resourceSlugs: new Set(['app1']),
    ownerSlugs: new Set(['owner1']),
  }

  describe('R23: header value patterns', () => {
    describe('accepted patterns', () => {
      it('accepts whole placeholder <TOKEN>', () => {
        const server = makeServer({
          slug: 'test',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: '<TOKEN>' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })

      it('accepts Bearer <TOKEN>', () => {
        const server = makeServer({
          slug: 'auth',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { Authorization: 'Bearer <TOKEN>' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })

      it('accepts Token <API_KEY>', () => {
        const server = makeServer({
          slug: 'auth',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { Authorization: 'Token <API_KEY>' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })

      it('accepts Basic <CREDENTIALS>', () => {
        const server = makeServer({
          slug: 'auth',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { Authorization: 'Basic <CREDENTIALS>' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })

      it('accepts <USERNAME>@example.com', () => {
        const server = makeServer({
          slug: 'email',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { user: '<USERNAME>@example.com' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })

      it('accepts <SNOWFLAKE_USERNAME>@EXAMPLE.COM', () => {
        const server = makeServer({
          slug: 'snowflake',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { user: '<SNOWFLAKE_USERNAME>@EXAMPLE.COM' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })

      it('accepts placeholder with digits <API_KEY_2>', () => {
        const server = makeServer({
          slug: 'digits',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: '<API_KEY_2>' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })

      it('accepts placeholder with underscores <GITLAB_API_TOKEN>', () => {
        const server = makeServer({
          slug: 'gitlab',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { api_key: '<GITLAB_API_TOKEN>' },
          },
        })
        expect(() => validateMcpServers([server], known)).not.toThrow()
      })
    })

    describe('rejected patterns', () => {
      it('rejects secret after placeholder <TOKEN>sk-live-abc123', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: '<TOKEN>sk-live-abc123' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'key' must match/,
        )
      })

      it('rejects secret before placeholder prod-<TOKEN>', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: 'prod-<TOKEN>' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'key' must match/,
        )
      })

      it('rejects stray brackets <A><', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: '<A><' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'key' must match/,
        )
      })

      it('rejects placeholder starting with digit <2FA_TOKEN>', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: '<2FA_TOKEN>' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'key' must match/,
        )
      })

      it('rejects lowercase placeholder <lowercase>', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: '<lowercase>' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'key' must match/,
        )
      })

      it('rejects literal value PROD', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { env: 'PROD' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'env' must match/,
        )
      })

      it('rejects literal value abc123', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { token: 'abc123' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'token' must match/,
        )
      })

      it('rejects email without placeholder you@example.com', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { user: 'you@example.com' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'user' must match/,
        )
      })

      it('rejects two placeholders <A> <B>', () => {
        const server = makeServer({
          slug: 'bad',
          transport: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { key: '<A> <B>' },
          },
        })
        expect(() => validateMcpServers([server], known)).toThrow(
          /header 'key' must match/,
        )
      })
    })
  })

  it('accepts server with no headers', () => {
    const server = makeServer({
      slug: 'no-headers',
      transport: { type: 'http', url: 'https://example.com/mcp' },
    })
    expect(() => validateMcpServers([server], known)).not.toThrow()
  })

  it('accepts stdio transport with no header validation', () => {
    const server = makeServer({
      slug: 'stdio',
      transport: { type: 'stdio', command: 'test', args: [] },
    })
    expect(() => validateMcpServers([server], known)).not.toThrow()
  })

  it('lists all header problems with server slug prefix', () => {
    const server = makeServer({
      slug: 'multi-bad',
      transport: {
        type: 'http',
        url: 'https://example.com/mcp',
        headers: { key1: 'literal', key2: '<lowercase>' },
      },
    })
    expect(() => validateMcpServers([server], known)).toThrow(
      /multi-bad: header 'key1'.*multi-bad: header 'key2'/s,
    )
  })

  it('accepts placeholder with digits like <API_KEY_2>', () => {
    const server = makeServer({
      slug: 'digits',
      transport: {
        type: 'http',
        url: 'https://example.com/mcp',
        headers: { key: '<API_KEY_2>' },
      },
    })
    expect(() => validateMcpServers([server], known)).not.toThrow()
  })

  it('rejects placeholder starting with digit like <2FA_TOKEN>', () => {
    const server = makeServer({
      slug: 'bad',
      transport: {
        type: 'http',
        url: 'https://example.com/mcp',
        headers: { key: '<2FA_TOKEN>' },
      },
    })
    expect(() => validateMcpServers([server], known)).toThrow(
      /header 'key' must contain at least one <UPPERCASE_NAME> placeholder/,
    )
  })

  it('checks slug format', () => {
    const server = makeServer({
      slug: 'Bad-Slug',
      transport: { type: 'http', url: 'https://example.com/mcp' },
    })
    expect(() => validateMcpServers([server], known)).toThrow(
      /slug must be lowercase/,
    )
  })

  it('checks requiredAppSlugs are known', () => {
    const server = makeServer({
      slug: 'test',
      requiredAppSlugs: ['unknown'],
      transport: { type: 'http', url: 'https://example.com/mcp' },
    })
    expect(() => validateMcpServers([server], known)).toThrow(
      /requiredAppSlugs entry 'unknown' is not an app/,
    )
  })

  it('checks ownerSlug is known', () => {
    const server = makeServer({
      slug: 'test',
      ownerSlug: 'unknown',
      transport: { type: 'http', url: 'https://example.com/mcp' },
    })
    expect(() => validateMcpServers([server], known)).toThrow(
      /ownerSlug 'unknown' is not a known person/,
    )
  })

  it('checks sources is not empty', () => {
    const server = makeServer({
      slug: 'test',
      sources: [],
      transport: { type: 'http', url: 'https://example.com/mcp' },
    })
    expect(() => validateMcpServers([server], known)).toThrow(
      /sources is empty/,
    )
  })

  it('checks tools is not empty', () => {
    const server = makeServer({
      slug: 'test',
      tools: [],
      transport: { type: 'http', url: 'https://example.com/mcp' },
    })
    expect(() => validateMcpServers([server], known)).toThrow(/tools is empty/)
  })

  it('checks duplicate slugs', () => {
    const server1 = makeServer({ slug: 'duplicate' })
    const server2 = makeServer({ slug: 'duplicate' })
    expect(() => validateMcpServers([server1, server2], known)).toThrow(
      /duplicate: duplicate slug/,
    )
  })
})
