import type {
  AppApprovalMethod,
  GroupingTagDefinition,
  Resource,
} from '@igstack/app-catalog-backend-core'
import type { CommunityTag } from '@igstack/app-catalog-shared-core'
import type { MockDb } from './MockDb'
import type { MockUserContext, UserConfig } from './MockUserContext'
import type { MockCommunityToolsStore } from './MockCommunityToolsStore'

let counter = 0

function nextId(): string {
  counter++
  return `test-id-${counter}`
}

function nextSlug(): string {
  return `app-${counter}`
}

export class MockBackendConfigurer {
  constructor(
    readonly db: MockDb,
    readonly userContext: MockUserContext,
    readonly communityToolsStore?: MockCommunityToolsStore,
  ) {}

  withApp(overrides?: Partial<Resource>): Resource {
    const id = overrides?.id ?? nextId()
    const app: Resource = {
      id,
      slug: overrides?.slug ?? nextSlug(),
      displayName: overrides?.displayName ?? `App ${counter}`,
      description: overrides?.description,
      tags: overrides?.tags ?? [],
      screenshotIds: overrides?.screenshotIds ?? [],
      ...overrides,
    }
    this.db.upsertResource(app)
    return app
  }

  withTag(overrides?: Partial<GroupingTagDefinition>): GroupingTagDefinition {
    const def: GroupingTagDefinition = {
      prefix: overrides?.prefix ?? `tag-${nextId()}`,
      displayName: overrides?.displayName ?? 'Tag',
      description: overrides?.description ?? '',
      values: overrides?.values ?? [],
      ...overrides,
    }
    this.db.setTagDefinitions([...this.db.tagsDefinitions, def])
    return def
  }

  withApprovalMethod(
    overrides?: Partial<AppApprovalMethod>,
  ): AppApprovalMethod {
    const slug = overrides?.slug ?? `method-${nextId()}`
    const method = {
      slug,
      type: 'service' as const,
      displayName: overrides?.displayName ?? 'Approval Method',
      config: {},
      ...overrides,
    } as AppApprovalMethod
    this.db.setApprovalMethods([...this.db.approvalMethods, method])
    return method
  }

  withSubResource(
    overrides: Partial<Resource> & { appSlug: string },
  ): Resource {
    const appSlug = overrides.appSlug
    const id = overrides.id ?? nextId()
    const resource: Resource = {
      id,
      slug: overrides.slug ?? `sr-${id}`,
      displayName: overrides.displayName ?? `Sub Resource ${counter}`,
      aliases: overrides.aliases ?? [],
      approverSlugs: overrides.approverSlugs ?? [],
      parentSlug: appSlug,
      tier: overrides.tier,
      ownerPersonSlug: overrides.ownerPersonSlug,
      accessRequest: overrides.accessRequest,
      accessComments: overrides.accessComments,
      description: overrides.description,
      extra: overrides.extra,
    }
    this.db.upsertResource(resource)
    return resource
  }

  withUser(overrides: Partial<UserConfig>): void {
    this.userContext.setUser(overrides)
  }

  withCommunityTools(config: {
    enabled: boolean
    captureHosts?: string[]
    tools?: {
      slug: string
      name: string
      url: string
      summary: string
      descriptionMd: string
      ownerSlugs: string[]
      tags: CommunityTag[]
      views30d?: number
      viewsAll?: number
      reviewedAt?: Date | null
      failingSince?: Date | null
    }[]
    persons?: {
      slug: string
      firstName: string
      lastName: string
    }[]
  }): void {
    if (!this.communityToolsStore) {
      throw new Error('Community tools store not available')
    }

    if (config.persons) {
      for (const person of config.persons) {
        this.communityToolsStore.withPerson(
          person.slug,
          person.firstName,
          person.lastName,
        )
      }
    }

    if (config.tools) {
      for (const tool of config.tools) {
        this.communityToolsStore.withTool(tool)
      }
    }
  }
}

/** Reset the counter between tests */
export function resetConfigurerCounter(): void {
  counter = 0
}
