import type { MockBackendConfigurer } from './MockBackendConfigurer'
import { MOCK_NOW } from './MockCommunityToolsStore'
import type { BrowserStateCfg } from './BrowserStateCfg'
import type { NetworkConfigurerCfg } from '../mock-network/NetworkConfigurerCfg'

const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface ConfigurerContext {
  backendCfg: MockBackendConfigurer
  browserStateCfg: BrowserStateCfg
  networkCfg: NetworkConfigurerCfg
}

/** A magazine is a function that configures the context */
export type Magazine = (ctx: ConfigurerContext) => void

// ---------------------------------------------------------------------------
// Full magazine features
// ---------------------------------------------------------------------------

interface FullFeatures {
  prepopulateCache?: boolean
  dismissOnboarding?: boolean
}

function fullMagazine(
  features: FullFeatures,
  postConfigure?: Magazine,
): Magazine {
  return (ctx) => {
    const { backendCfg, browserStateCfg } = ctx

    // Approval methods — all 3 types
    const supportPortal = backendCfg.withApprovalMethod({
      slug: 'it-support',
      type: 'service',
      displayName: 'Support Portal',
      config: {
        url: 'https://support.example.com',
        description: 'General IT support desk',
        portal: {
          key: 'HELP',
          area: 'IT',
          requestTypes: [
            {
              id: '11',
              name: 'Database access',
              description: 'Access to a production database',
              url: 'https://support.example.com/create/11',
              fields: [
                {
                  name: 'Component/s',
                  required: true,
                  type: 'array',
                  options: [
                    'Orders DB',
                    'Billing DB',
                    "Legacy DB - HELP doesn't handle",
                  ],
                },
                { name: 'Manager', required: true, type: 'user' },
              ],
            },
            {
              id: '12',
              name: 'New laptop',
              url: 'https://support.example.com/create/12',
              fields: [],
            },
          ],
          followUp: 'Access is granted within **2 business days**.',
        },
      },
    })
    backendCfg.withApprovalMethod({
      slug: 'ops-support',
      type: 'service',
      displayName: 'Ops Portal',
      config: { url: 'https://opsdesk.example.com' },
    })
    const managerApproval = backendCfg.withApprovalMethod({
      slug: 'manager-approval',
      type: 'custom',
      displayName: 'Manager Approval',
      config: {},
    })
    backendCfg.withApprovalMethod({
      slug: 'self-service',
      type: 'custom',
      displayName: 'Self-Service',
      config: {},
    })

    // Tag definitions
    backendCfg.withTag({
      prefix: 'category',
      displayName: 'Category',
      description: 'Application category',
      values: [
        {
          value: 'project-management',
          displayName: 'Project Management',
          description: '',
        },
        {
          value: 'communication',
          displayName: 'Communication',
          description: '',
        },
        { value: 'internal', displayName: 'Internal Tools', description: '' },
      ],
    })
    backendCfg.withTag({
      prefix: 'team',
      displayName: 'Team',
      description: 'Owning team',
      values: [
        { value: 'engineering', displayName: 'Engineering', description: '' },
        { value: 'platform', displayName: 'Platform', description: '' },
      ],
    })

    // Apps
    backendCfg.withApp({
      slug: 'taskflow',
      displayName: 'TaskFlow',
      description: 'Project tracking and issue management',
      tags: ['category:project-management', 'team:engineering'],
      screenshotIds: ['ss-taskflow-1', 'ss-taskflow-2', 'ss-taskflow-3'],
      appUrl: 'https://taskflow.example.com',
      accessRequest: {
        approvalMethodSlug: supportPortal.slug,
        comments: 'Submit a ticket',
      },
      quickJumps: [
        {
          identity: 'Task Id',
          title: 'Open task',
          url: '{{baseHost}}/task/{{value}}',
        },
        {
          identity: 'Task Id',
          title: 'Task history',
          url: '{{baseHost}}/task/{{value}}/history',
        },
        {
          identity: 'Board Id',
          title: 'Open board',
          url: '{{baseHost}}/board/{{value}}',
        },
      ],
    })

    backendCfg.withApp({
      slug: 'teamchat',
      displayName: 'TeamChat',
      description: 'Team messaging and collaboration',
      tags: ['category:communication', 'team:platform'],
      screenshotIds: ['ss-teamchat-1'],
      appUrl: 'https://teamchat.example.com',
    })

    const newTool = backendCfg.withApp({
      slug: 'new-tool',
      displayName: 'New Tool',
      description: 'The modern replacement',
      tags: ['category:internal'],
    })

    backendCfg.withApp({
      slug: 'old-tool',
      displayName: 'Old Tool',
      description: 'Legacy project tracker',
      tags: ['category:project-management'],
      deprecated: {
        type: 'deprecated',
        comment: 'Replaced by New Tool',
        replacementSlug: newTool.slug,
      },
    })

    backendCfg.withApp({
      slug: 'legacy-app',
      displayName: 'Legacy App',
      description: 'Still works but discouraged',
      tags: ['category:internal'],
      deprecated: {
        type: 'discouraged',
        comment: 'Consider using alternatives',
      },
    })

    backendCfg.withApp({
      slug: 'internal-portal',
      displayName: 'Internal Portal',
      description: 'Company intranet portal',
      tags: ['category:internal', 'team:platform'],
      screenshotIds: ['ss-portal-1'],
      accessRequest: {
        approvalMethodSlug: managerApproval.slug,
        comments: 'Requires manager approval',
      },
    })

    backendCfg.withApp({
      slug: 'admin-console',
      displayName: 'Admin Console',
      description: 'System administration dashboard',
      tags: ['category:internal', 'team:engineering'],
    })

    // Apply features
    if (features.dismissOnboarding) {
      browserStateCfg.dismissOnboarding()
    }
    if (features.prepopulateCache) {
      browserStateCfg.withOfflineData()
    }

    // Apply post-configurer (for test-specific overrides)
    postConfigure?.(ctx)
  }
}

// ---------------------------------------------------------------------------
// Single magazine
// ---------------------------------------------------------------------------

function singleMagazine(postConfigure?: Magazine): Magazine {
  return (ctx) => {
    const { backendCfg } = ctx

    const method = backendCfg.withApprovalMethod({
      slug: 'it-support',
      type: 'service',
      displayName: 'Support Portal',
      config: { url: 'https://support.example.com' },
    })

    backendCfg.withTag({
      prefix: 'category',
      displayName: 'Category',
      description: 'Application category',
      values: [
        {
          value: 'project-management',
          displayName: 'Project Management',
          description: '',
        },
      ],
    })

    backendCfg.withApp({
      slug: 'taskflow',
      displayName: 'TaskFlow',
      description: 'Project tracking and issue management',
      tags: ['category:project-management'],
      screenshotIds: ['screenshot-taskflow-1', 'screenshot-taskflow-2'],
      appUrl: 'https://taskflow.example.com',
      accessRequest: {
        approvalMethodSlug: method.slug,
        comments: 'Submit a ticket to IT',
      },
    })

    postConfigure?.(ctx)
  }
}

// ---------------------------------------------------------------------------
// Sub-resource magazine
// ---------------------------------------------------------------------------

/** How many sub-resources the parent gets. Above COLLAPSED_SUB_LIMIT (5) on
 *  purpose, so the collapsed "... N more" row is exercised. */
const SUB_RESOURCE_COUNT = 47

/**
 * One parent resource with a long list of children — the shape that makes
 * sub-resource search worth having (a cloud console with dozens of accounts, a
 * database server with dozens of schemas).
 *
 * Children are named `project-01 … project-47` so a query can match all of them
 * at once ("project"), exactly one ("project-02"), or none ("Cloud Console" —
 * the parent's own name). Each carries a synthetic 12-digit account id in
 * `aliases`, so searching by identifier rather than by name is covered too.
 *
 * Access data is deliberately uneven:
 *  - the parent and `project-02` both have an `accessRequest` → two-step chain
 *  - `project-03` has only top-level `approverSlugs`/`accessComments` → the
 *    fallback path, which must still tell the user how to get access
 *  - everything else has none
 */
function subResourcesMagazine(postConfigure?: Magazine): Magazine {
  return (ctx) => {
    const { backendCfg } = ctx

    const supportPortal = backendCfg.withApprovalMethod({
      slug: 'it-support',
      type: 'service',
      displayName: 'Support Portal',
      config: { url: 'https://support.example.com' },
    })

    const parent = backendCfg.withApp({
      slug: 'cloud-console',
      displayName: 'Cloud Console',
      description: 'Cloud accounts and the projects inside them',
      appUrl: 'https://console.example.com',
      // `notes` is the entry's own `adminNotes` as the API serves it: the
      // provisioning route, not something the requester does.
      notes:
        'Run the account-provisioning pipeline once the request is approved',
      accessRequest: {
        approvalMethodSlug: supportPortal.slug,
        comments: 'Request the base role first',
        // One role with a description and one without, both carrying the
        // directory group that actually grants them.
        roles: [
          {
            displayName: 'Viewer',
            description: 'Read-only access to every project',
            adminNotes: 'AD Group: CloudConsole_Viewer',
          },
          {
            displayName: 'Operator',
            adminNotes: 'AD Group: CloudConsole_Operator',
          },
        ],
      },
    })

    backendCfg.withApp({
      slug: 'teamchat',
      displayName: 'TeamChat',
      description: 'Team messaging and collaboration',
    })

    for (let i = 1; i <= SUB_RESOURCE_COUNT; i++) {
      const n = String(i).padStart(2, '0')
      backendCfg.withSubResource({
        appSlug: parent.slug,
        slug: `project-${n}`,
        displayName: `project-${n}`,
        aliases: [String(i).padStart(12, '0')],
        tier: i % 2 === 0 ? 'prod' : 'dev',
        ...(i === 2
          ? {
              accessRequest: {
                approvalMethodSlug: supportPortal.slug,
                comments: 'Then request this project',
              },
            }
          : {}),
        ...(i === 3
          ? {
              approverSlugs: ['owner@example.com'],
              accessComments: 'Ask the project owner directly',
            }
          : {}),
      })
    }

    postConfigure?.(ctx)
  }
}

// ---------------------------------------------------------------------------
// Community tools magazine
// ---------------------------------------------------------------------------

/** The page the add-a-tool scenarios paste: the capture browser reads its title. */
export const QC_HEATMAP_URL = 'https://qc-heatmap-9f8e.pages.example.com/'

function communityMagazine(postConfigure?: Magazine): Magazine {
  return (ctx) => {
    const { backendCfg } = ctx
    const tools = backendCfg.communityTools

    backendCfg.withApp({
      slug: 'order-service',
      displayName: 'Order Service',
      description: 'Order management and tracking',
      appUrl: 'https://orders.pages.example.com/',
    })

    // A directory slug is the person's email: that is what makes the signed-in owner an owner.
    const person = (firstName: string, lastName: string) => {
      const email = `${firstName}.${lastName}@example.com`.toLowerCase()
      return backendCfg.withPerson({ slug: email, email, firstName, lastName })
    }
    const dana = person('Dana', 'Lee')
    const sam = person('Sam', 'Ortiz')
    const robin = person('Robin', 'Park')

    tools.enable({ captureHosts: ['example.com'] })
    tools.withPage(QC_HEATMAP_URL, 'QC Heatmap')

    tools.seed({
      name: 'Ops Runbook',
      url: 'https://ops-runbook-1a2b.pages.example.com/',
      summary: 'What to do when a nightly job fails',
      descriptionMd:
        'Open the job that failed, then follow the steps for its error code.',
      ownerSlugs: [dana.slug],
      tags: [{ kind: 'topic', value: 'runbook' }],
      screenshotId: 'ops-runbook-shot',
      capturedAt: MOCK_NOW,
      createdAt: new Date(MOCK_NOW.getTime() - 200 * DAY_MS),
      views30d: 412,
      viewsAll: 1203,
    })
    tools.seed({
      name: 'Kit Rules Playground',
      url: 'https://kit-rules-sandbox-7c01.pages.example.com/',
      summary: 'Try a kit rule change before you ship it',
      descriptionMd:
        'Paste a rule, pick a sample kit, and see what it decides.',
      ownerSlugs: [sam.slug],
      tags: [{ kind: 'topic', value: 'sandbox' }],
      screenshotId: 'kit-rules-shot',
      capturedAt: MOCK_NOW,
      createdAt: new Date(MOCK_NOW.getTime() - 40 * DAY_MS),
      views30d: 288,
      viewsAll: 288,
    })
    tools.seed({
      name: 'Old Tracker',
      url: 'https://old-tracker-3d4e.pages.example.com/',
      summary: 'The issue list from before the move',
      descriptionMd: 'Read-only. Search by the old issue number.',
      ownerSlugs: [robin.slug],
      screenshotId: 'old-tracker-shot',
      capturedAt: MOCK_NOW,
      createdAt: new Date(MOCK_NOW.getTime() - 400 * DAY_MS),
      views30d: 22,
      viewsAll: 22,
    })

    // The features sign in explicitly, so the catalog starts anonymous.
    backendCfg.withUser({ isAuthenticated: false })

    postConfigure?.(ctx)
  }
}

function mcpMagazine(postConfigure?: Magazine): Magazine {
  return (ctx) => {
    // Start with the full catalog
    fullMagazine({}, undefined)(ctx)

    const { backendCfg } = ctx

    // Add groups for MCP server owners
    const aiTeam = backendCfg.withGroup({
      slug: 'ai-team',
      displayName: 'AI Platform Team',
      email: 'ai-team@example.com',
      memberSlugs: [],
    })

    // 8 MCP servers covering all Triad combinations: access × needsAccess × sensitiveData
    // | Server        | Access | Needs Access | Sensitive |
    // |---------------|--------|--------------|-----------|
    // | ticket-search | read   | yes          | no        |
    // | code-search   | read   | yes          | yes       |
    // | wiki          | read   | no           | no        |
    // | chat-search   | read   | no           | yes       |
    // | fs-local      | write  | yes          | no        |
    // | db-query      | write  | yes          | yes       |
    // | mail-test     | write  | no           | no        |
    // | logs          | write  | no           | yes       |

    // 1. read + needs access + not sensitive
    backendCfg.withMcpServer({
      slug: 'ticket-search',
      displayName: 'Ticket Search',
      description: 'Search and view issue tickets',
      category: 'productivity',
      status: 'production',
      access: 'read',
      requiredAppSlugs: ['taskflow'],
      auth: {
        kind: 'sso',
        note: 'Uses your TaskFlow SSO credentials',
      },
      transport: {
        type: 'http',
        url: 'https://mcp.example.com/tickets',
        headers: { Authorization: '<TASKFLOW_TOKEN>' },
      },
      tools: [
        { name: 'search_tickets', description: 'Search for tickets' },
        { name: 'get_ticket', description: 'Get ticket details' },
      ],
      sources: [{ url: 'https://github.com/example/ticket-mcp' }],
    })

    // 2. read + needs access + sensitive (stdio)
    backendCfg.withMcpServer({
      slug: 'code-search',
      displayName: 'Code Search',
      description: 'Search code repositories',
      category: 'dev-tools',
      status: 'production',
      access: 'read',
      sensitiveData: true,
      requiredAppSlugs: ['taskflow'],
      auth: {
        kind: 'sso',
        note: 'Uses GitHub CLI authentication',
      },
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@example/code-search-mcp'],
      },
      tools: [
        { name: 'search_code', description: 'Search code' },
        { name: 'get_file', description: 'Get file contents' },
      ],
      sources: [{ url: 'https://github.com/example/code-search-mcp' }],
    })

    // 3. read + no access needed + not sensitive (token with steps)
    backendCfg.withMcpServer({
      slug: 'wiki',
      displayName: 'Wiki Browser',
      description: 'Search documentation and wiki pages',
      category: 'knowledge',
      aliases: ['docs'],
      status: 'beta',
      access: 'read',
      auth: {
        kind: 'token',
        note: 'Requires a wiki API token',
        token: {
          page: 'https://wiki.example.com/settings/tokens',
          steps: [
            'Go to wiki.example.com/settings/tokens',
            'Click "Generate Token"',
            'Copy the token',
          ],
        },
      },
      transport: {
        type: 'http',
        url: 'https://wiki.example.com/mcp',
        headers: { 'X-API-Key': '<WIKI_TOKEN>' },
      },
      tools: [
        { name: 'search_pages', description: 'Search wiki pages' },
        { name: 'get_page', description: 'Get page content' },
      ],
      sources: [{ url: 'https://wiki.example.com/mcp-docs' }],
    })

    // 4. read + no access needed + sensitive
    backendCfg.withMcpServer({
      slug: 'chat-search',
      displayName: 'Chat Search',
      description: 'Search team chat messages and channels',
      category: 'communication',
      status: 'personal',
      access: 'read',
      sensitiveData: true,
      auth: {
        kind: 'token',
        note: 'Requires a chat bot token',
        token: {
          page: 'https://chat.example.com/apps',
          steps: [
            'Create a chat app',
            'Add bot token scopes: channels:history, channels:read',
            'Install to workspace',
            'Copy Bot User OAuth Token',
          ],
        },
      },
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@example/chat-mcp'],
      },
      tools: [
        { name: 'list_channels', description: 'List chat channels' },
        { name: 'read_messages', description: 'Read channel messages' },
      ],
      sources: [{ url: 'https://github.com/example/chat-mcp' }],
    })

    // 5. write + needs access + not sensitive
    backendCfg.withMcpServer({
      slug: 'fs-local',
      displayName: 'Local Filesystem',
      description: 'Read and write local project files',
      category: 'dev-tools',
      status: 'production',
      access: 'write',
      writeNote: 'Can modify local files',
      requiredAppSlugs: ['taskflow'],
      auth: {
        kind: 'token',
        note: 'Token is the file path allowlist',
        token: {
          page: 'file://~/.config/mcp/filesystem.json',
          steps: [
            'Create ~/.config/mcp/filesystem.json',
            'Add allowed paths: {"paths": ["/Users/me/projects"]}',
          ],
        },
      },
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
      },
      tools: [
        { name: 'read_file', description: 'Read file contents' },
        { name: 'write_file', description: 'Write to a file' },
        { name: 'list_directory', description: 'List directory contents' },
      ],
      sources: [
        {
          url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        },
      ],
    })

    // 6. write + needs access + sensitive
    backendCfg.withMcpServer({
      slug: 'db-query',
      displayName: 'Database Query',
      description: 'Query analytics warehouse',
      category: 'data',
      status: 'beta',
      access: 'write',
      writeNote: 'Can execute write queries on dev databases',
      sensitiveData: true,
      requiredAppSlugs: ['teamchat'],
      auth: {
        kind: 'sso',
      },
      transport: {
        type: 'stdio',
        command: 'warehouse-mcp',
        args: ['--env', 'dev'],
      },
      tools: [
        { name: 'query', description: 'Execute SQL query' },
        { name: 'list_tables', description: 'List tables' },
      ],
      sources: [{ url: 'https://warehouse.example.com/docs/mcp' }],
    })

    // 7. write + no access needed + not sensitive (relative URL)
    backendCfg.withMcpServer({
      slug: 'mail-test',
      displayName: 'Mail Catcher',
      description: 'View and manage test emails',
      category: 'dev-tools',
      status: 'personal',
      access: 'write',
      writeNote: 'Can clear test emails',
      auth: {
        kind: 'token',
        token: {
          page: 'http://localhost:1080/settings',
          steps: ['Run mail catcher locally', 'Copy the admin token'],
        },
      },
      transport: {
        type: 'http',
        url: '/mcp/mail',
        headers: { 'X-Admin-Token': '<MAIL_ADMIN_TOKEN>' },
      },
      tools: [
        { name: 'list_emails', description: 'List captured emails' },
        { name: 'clear_all', description: 'Clear all test emails' },
      ],
      sources: [{ url: 'https://github.com/example/mail-catcher-mcp' }],
    })

    // 8. write + no access needed + sensitive (group owner, support, two sources, one with a pulse)
    backendCfg.withMcpServer({
      slug: 'logs',
      displayName: 'Log Viewer',
      description: 'Query application logs and traces',
      category: 'observability',
      status: 'production',
      access: 'write',
      writeNote: 'Can create log queries and alerts',
      sensitiveData: true,
      auth: {
        kind: 'sso',
      },
      transport: {
        type: 'http',
        url: 'https://logs.example.com/mcp',
      },
      tools: [
        { name: 'query_logs', description: 'Query logs' },
        { name: 'create_alert', description: 'Create a log alert' },
      ],
      ownerSlug: aiTeam.slug,
      support: {
        label: '#logs-help',
        url: 'https://chat.example.com/logs-help',
      },
      sources: [
        {
          url: 'https://logs.example.com/docs',
          pulse: {
            state: 'ok',
            intervalHours: 24,
            cadence: 'daily',
            lastCheckedAt: '2026-01-02T00:00:00.000Z',
            dueAt: '2026-01-03T00:00:00.000Z',
            lastContentChangeAt: '2026-01-01T00:00:00.000Z',
            contentChangeIsLowerBound: false,
            checks: [{ date: '2026-01-02T00:00:00.000Z', changed: false }],
          },
        },
        { url: 'https://github.com/example/log-viewer-mcp' },
      ],
    })

    // MCP catalog config
    backendCfg.withMcpCatalogConfig({
      categories: [
        {
          key: 'productivity',
          title: 'Productivity',
          blurb: 'Task tracking, tickets, and project management',
        },
        { key: 'dev-tools', title: 'Developer Tools' },
      ],
      intents: [
        {
          query: 'logs',
          title: 'View Logs',
          caption: 'Query application logs',
          icon: 'search',
        },
        {
          query: 'tickets',
          title: 'Search Tickets',
          caption: 'Find and view issues',
          icon: 'ticket',
        },
      ],
      tryQueries: ['logs', 'tickets'],
      sensitiveDataLabel: 'Contains company data',
      installIconUrl: 'https://example.com/mcp-icon.svg',
    })

    postConfigure?.(ctx)
  }
}

// ---------------------------------------------------------------------------
// Magazine entries
// ---------------------------------------------------------------------------

export const magazine = {
  /** No apps, no tags, no approval methods */
  empty: (() => {}) satisfies Magazine,

  /** 1 app (TaskFlow), 1 tag, 1 approval method — accepts optional post-configurer */
  single: (postConfigure?: Magazine) => singleMagazine(postConfigure),

  /** Full catalog, first-time user — accepts optional post-configurer */
  full: (postConfigure?: Magazine) => fullMagazine({}, postConfigure),

  /** Full catalog, returning user (cache + onboarding dismissed) — accepts optional post-configurer */
  fullReturningUser: (postConfigure?: Magazine) =>
    fullMagazine(
      { prepopulateCache: true, dismissOnboarding: true },
      postConfigure,
    ),

  /** 1 parent with 47 sub-resources + 1 unrelated app — accepts optional post-configurer */
  subResources: (postConfigure?: Magazine) =>
    subResourcesMagazine(postConfigure),

  /** Community tools catalog with 3 tools, 3 persons, and 1 official app — accepts optional post-configurer */
  community: (postConfigure?: Magazine) => communityMagazine(postConfigure),

  /** Full catalog plus 8 MCP servers and config — accepts optional post-configurer */
  mcp: (postConfigure?: Magazine) => mcpMagazine(postConfigure),

  /** Inline custom configurer — pass-through for ad-hoc tests */
  custom: (fn: Magazine): Magazine => fn,
}
