import type { MockBackendConfigurer } from './MockBackendConfigurer'
import type { BrowserStateCfg } from './BrowserStateCfg'
import type { NetworkConfigurerCfg } from '../mock-network/NetworkConfigurerCfg'

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
    const helpdesk = backendCfg.withApprovalMethod({
      slug: 'it-helpdesk',
      type: 'service',
      displayName: 'IT Help Desk',
      config: { url: 'https://helpdesk.example.com' },
    })
    const managerApproval = backendCfg.withApprovalMethod({
      slug: 'manager-approval',
      type: 'personTeam',
      displayName: 'Manager Approval',
      config: {
        reachOutContacts: [
          { displayName: 'IT Team', contact: 'it-team@example.com' },
        ],
      },
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
      slug: 'jira',
      displayName: 'Jira',
      description: 'Project tracking and issue management',
      tags: ['category:project-management', 'team:engineering'],
      screenshotIds: ['ss-jira-1', 'ss-jira-2', 'ss-jira-3'],
      appUrl: 'https://jira.example.com',
      accessRequest: {
        approvalMethodId: helpdesk.slug,
        comments: 'Submit a ticket',
      },
    })

    backendCfg.withApp({
      slug: 'slack',
      displayName: 'Slack',
      description: 'Team messaging and collaboration',
      tags: ['category:communication', 'team:platform'],
      screenshotIds: ['ss-slack-1'],
      appUrl: 'https://slack.example.com',
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
        approvalMethodId: managerApproval.slug,
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
      slug: 'it-helpdesk',
      type: 'service',
      displayName: 'IT Help Desk',
      config: { url: 'https://helpdesk.example.com' },
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
      slug: 'jira',
      displayName: 'Jira',
      description: 'Project tracking and issue management',
      tags: ['category:project-management'],
      screenshotIds: ['screenshot-jira-1', 'screenshot-jira-2'],
      appUrl: 'https://jira.example.com',
      accessRequest: {
        approvalMethodId: method.slug,
        comments: 'Submit a ticket to IT',
      },
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

  /** 1 app (Jira), 1 tag, 1 approval method — accepts optional post-configurer */
  single: (postConfigure?: Magazine) => singleMagazine(postConfigure),

  /** Full catalog, first-time user — accepts optional post-configurer */
  full: (postConfigure?: Magazine) => fullMagazine({}, postConfigure),

  /** Full catalog, returning user (cache + onboarding dismissed) — accepts optional post-configurer */
  fullReturningUser: (postConfigure?: Magazine) =>
    fullMagazine(
      { prepopulateCache: true, dismissOnboarding: true },
      postConfigure,
    ),

  /** Inline custom configurer — pass-through for ad-hoc tests */
  custom: (fn: Magazine): Magazine => fn,
}
