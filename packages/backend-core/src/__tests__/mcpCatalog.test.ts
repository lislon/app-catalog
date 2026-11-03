// @vitest-environment node
/**
 * MCP server catalog: boot sync, read-back, validation and the config query.
 * The DB-backed part needs AC_TEST_DATABASE_URL (throwaway schema, see utils/testDatabase).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { McpServer } from '@igstack/app-catalog-shared-core'
import { syncAppCatalog } from '../db/syncAppCatalog'
import { getMcpServersFromPrisma } from '../modules/appCatalog/service'
import { validateMcpServers } from '../modules/mcpCatalog/validateMcpServers'
import { createMcpCatalogRouter } from '../modules/mcpCatalog/router'
import { computeSourcePulse } from '../modules/appCatalog/sourcePulse'
import { createTrpcRouter } from '../server/controller'
import type { AcTrpcContext } from '../server/acTrpcContext'
import type { Group, Person } from '../types/common/personGroupTypes'
import type { Resource } from '../types/common/appCatalogTypes'
import { parseSourceSlug } from '../utils/parseSourceSlug'
import { TEST_DB_URL, useTestDatabase } from './utils/testDatabase'

const ctx = { companySpecificBackend: {} } as unknown as AcTrpcContext

const sharedUrl = 'https://test-mcp-shared.example.com/tracker-guide'
const trackerReadme = 'https://test-mcp-tracker.example.com/readme'
const docsReadme = 'https://test-mcp-docs.example.com/readme'

const persons: Person[] = [{ slug: 'ann', firstName: 'Ann', lastName: 'Lee' }]
const groups: Group[] = [{ slug: 'platform-team', memberSlugs: ['ann'] }]
const trackerApp: Resource = {
  id: 'tracker',
  slug: 'tracker',
  displayName: 'Tracker',
  description: 'Issue tracker',
  sources: [sharedUrl],
}

const tracker: McpServer = {
  slug: 'tracker',
  displayName: 'Tracker',
  description: 'Read and update tickets',
  category: 'work-tracking',
  aliases: ['ticket', 'issue'],
  status: 'production',
  access: 'write',
  writeNote: 'Creates and comments on tickets',
  sensitiveData: true,
  requiredAppSlugs: ['tracker'],
  auth: {
    kind: 'token',
    note: 'Personal token',
    token: { page: 'https://tracker.example.com/tokens', steps: ['Create'] },
  },
  transport: {
    type: 'http',
    url: 'https://mcp.example.com/tracker',
    headers: { Authorization: '<TRACKER_TOKEN>' },
  },
  tools: [{ name: 'search_tickets', description: 'Find tickets' }],
  ownerSlug: 'platform-team',
  support: { label: '#tracker-help', url: 'https://chat.example.com/help' },
  sources: [trackerReadme, sharedUrl],
}

const docs: McpServer = {
  slug: 'docs',
  displayName: 'Docs',
  description: 'Search the docs',
  category: 'knowledge',
  aliases: [],
  status: 'beta',
  access: 'read',
  requiredAppSlugs: [],
  auth: { kind: 'none' },
  transport: { type: 'stdio', command: 'npx', args: ['docs-mcp'] },
  tools: [{ name: 'search_docs', description: 'Full-text search' }],
  sources: [docsReadme],
}

const known = {
  resourceSlugs: new Set(['tracker']),
  ownerSlugs: new Set(['ann', 'platform-team']),
}

/** What a bare config URL reads back as: no schedule yet, so pulse "never". */
function unscheduled(url: string) {
  return {
    url,
    sourceSlug: parseSourceSlug(url),
    parseDate: null,
    pulse: computeSourcePulse({
      lastCheckedAt: null,
      nextCheckAfter: null,
      lastContentChangeAt: null,
      checkIntervalHours: null,
      changeHistory: null,
    }),
  }
}

function asStored(server: McpServer) {
  return { ...server, sources: [...server.sources].sort().map(unscheduled) }
}

describe('validateMcpServers', () => {
  it('accepts valid servers', () => {
    expect(() => validateMcpServers([tracker, docs], known)).not.toThrow()
  })

  it.each<[string, McpServer[], RegExp]>([
    [
      'an unknown requiredAppSlugs entry',
      [{ ...tracker, requiredAppSlugs: ['nope'] }],
      /tracker: requiredAppSlugs entry 'nope'/,
    ],
    [
      'an unknown ownerSlug',
      [{ ...tracker, ownerSlug: 'ghost' }],
      /tracker: ownerSlug 'ghost'/,
    ],
    ['empty sources', [{ ...tracker, sources: [] }], /tracker: sources/],
    ['empty tools', [{ ...tracker, tools: [] }], /tracker: tools/],
    ['a duplicate slug', [docs, { ...docs }], /docs: duplicate slug/],
    [
      'a header value that is not a <...> placeholder',
      [
        {
          ...tracker,
          transport: {
            type: 'http',
            url: 'https://mcp.example.com/tracker',
            headers: { Authorization: 'glpat-realsecret' },
          },
        },
      ],
      /tracker: header 'Authorization'/,
    ],
  ])('rejects %s', (_, servers, message) => {
    expect(() => validateMcpServers(servers, known)).toThrow(message)
  })

  it('lists every problem in one error', () => {
    expect(() =>
      validateMcpServers(
        [
          { ...tracker, tools: [] },
          { ...docs, sources: [] },
        ],
        known,
      ),
    ).toThrow(/tracker: tools[\s\S]*docs: sources/)
  })
})

describe('mcpCatalog.config', () => {
  it('defaults the sensitive-data label', async () => {
    const caller = createMcpCatalogRouter().createCaller(ctx)
    expect(await caller.config()).toEqual({
      sensitiveDataLabel: 'Sensitive data',
    })
  })

  it('serves the company config from the main router', async () => {
    const config = {
      categories: [{ key: 'knowledge', title: 'Knowledge' }],
      tryQueries: ['tickets'],
      sensitiveDataLabel: 'Customer data',
    }
    const caller = createTrpcRouter(undefined, {
      mcpCatalog: config,
    }).createCaller(ctx)
    expect(await caller.mcpCatalog.config()).toEqual(config)
  })
})

describe.skipIf(!TEST_DB_URL)('MCP server sync (DB)', () => {
  const db = useTestDatabase('test_mcp')

  beforeEach(async () => {
    await db.prisma.dbMcpServer.deleteMany()
    await db.prisma.sourceUrl.deleteMany()
  })

  it('syncs servers and reads them back', async () => {
    await syncAppCatalog([trackerApp], [], [], undefined, {
      persons,
      groups,
      mcpServers: [tracker, docs],
    })

    expect(await getMcpServersFromPrisma()).toEqual([
      asStored(docs),
      asStored(tracker),
    ])
  })

  it('boot prune keeps URLs that only MCP servers cite', async () => {
    await syncAppCatalog([trackerApp], [], [], undefined, {
      persons,
      groups,
      mcpServers: [tracker],
    })
    // Next boot: the app drops the shared URL and no MCP list is passed at all
    await syncAppCatalog([{ ...trackerApp, sources: [] }], [], [], undefined, {
      persons,
      groups,
    })

    expect(await getMcpServersFromPrisma()).toEqual([asStored(tracker)])
  })

  it('a server dropped from config loses its row and links', async () => {
    const opts = { persons, groups }
    await syncAppCatalog([trackerApp], [], [], undefined, {
      ...opts,
      mcpServers: [tracker, docs],
    })
    await syncAppCatalog([trackerApp], [], [], undefined, {
      ...opts,
      mcpServers: [docs],
    })

    expect(await getMcpServersFromPrisma()).toEqual([asStored(docs)])
    expect(
      await db.prisma.sourceUrl.count({ where: { url: trackerReadme } }),
    ).toBe(0)
  })

  it('fails the boot before writing anything for MCP', async () => {
    await expect(
      syncAppCatalog([trackerApp], [], [], undefined, {
        persons,
        groups,
        mcpServers: [{ ...tracker, requiredAppSlugs: ['nope'] }],
      }),
    ).rejects.toThrow(/tracker: requiredAppSlugs entry 'nope'/)

    expect(await db.prisma.dbMcpServer.count()).toBe(0)
    expect(
      await db.prisma.sourceUrl.count({ where: { url: trackerReadme } }),
    ).toBe(0)
  })

  it('getData includes mcpServers', async () => {
    const caller = createTrpcRouter().createCaller(ctx)
    expect((await caller.appCatalog.getData()).mcpServers).toEqual([])

    await syncAppCatalog([trackerApp], [], [], undefined, {
      persons,
      groups,
      mcpServers: [docs],
    })
    expect((await caller.appCatalog.getData()).mcpServers).toEqual([
      asStored(docs),
    ])
  })
})
