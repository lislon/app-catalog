import type {
  AppApprovalMethod,
  GroupingTagDefinition,
  Resource,
} from '@igstack/app-catalog-backend-core'
import type { MockDb } from './MockDb'
import type { MockUserContext, UserConfig } from './MockUserContext'

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
      accessMaintainerGroupSlugs: overrides.accessMaintainerGroupSlugs ?? [],
      parentSlug: appSlug,
      tier: overrides.tier,
      ownerPersonSlug: overrides.ownerPersonSlug,
    }
    this.db.upsertResource(resource)
    return resource
  }

  withUser(overrides: Partial<UserConfig>): void {
    this.userContext.setUser(overrides)
  }
}

/** Reset the counter between tests */
export function resetConfigurerCounter(): void {
  counter = 0
}
