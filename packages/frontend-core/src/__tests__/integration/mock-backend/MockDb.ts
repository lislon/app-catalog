import type {
  AppApprovalMethod,
  AppCatalogData,
  GroupingTagDefinition,
  Resource,
} from '@igstack/app-catalog-backend-core'

export class MockDb {
  resources: Resource[] = []
  tagsDefinitions: GroupingTagDefinition[] = []
  approvalMethods: AppApprovalMethod[] = []

  upsertResource(resource: Resource): void {
    this.resources = [
      ...this.resources.filter((r) => r.id !== resource.id),
      resource,
    ]
  }

  /** @deprecated Use upsertResource */
  upsertApp(app: Resource): void {
    this.upsertResource(app)
  }

  getResources(): Resource[] {
    return this.resources
  }

  /** @deprecated Use getResources */
  getApps(): Resource[] {
    return this.getResources()
  }

  getResource(slug: string): Resource {
    const resource = this.resources.find((r) => r.slug === slug)
    if (!resource) {
      throw new Error(
        `MockDb: resource with slug "${slug}" not found. Available: ${this.resources.map((r) => r.slug).join(', ')}`,
      )
    }
    return resource
  }

  /** @deprecated Use getResource */
  getApp(slug: string): Resource {
    return this.getResource(slug)
  }

  setTagDefinitions(defs: GroupingTagDefinition[]): void {
    this.tagsDefinitions = defs
  }

  setApprovalMethods(methods: AppApprovalMethod[]): void {
    this.approvalMethods = methods
  }

  getAppCatalogData(): AppCatalogData {
    return {
      resources: this.resources,
      tagsDefinitions: this.tagsDefinitions,
      approvalMethods: this.approvalMethods,
      persons: [],
      groups: [],
    }
  }
}
