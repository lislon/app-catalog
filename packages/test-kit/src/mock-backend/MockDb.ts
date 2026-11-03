import type {
  AppApprovalMethod,
  AppCatalogData,
  CatalogMcpServer,
  Group,
  GroupingTagDefinition,
  Person,
  Resource,
} from '@igstack/app-catalog-backend-core'
import type { McpCatalogConfig } from '@igstack/app-catalog-shared-core'

export class MockDb {
  resources: Resource[] = []
  tagsDefinitions: GroupingTagDefinition[] = []
  approvalMethods: AppApprovalMethod[] = []
  persons: Person[] = []
  groups: Group[] = []
  mcpServers: CatalogMcpServer[] = []
  mcpCatalogConfig: McpCatalogConfig = {}

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

  setGroups(groups: Group[]): void {
    this.groups = groups
  }

  setMcpServers(servers: CatalogMcpServer[]): void {
    this.mcpServers = servers
  }

  setMcpCatalogConfig(config: McpCatalogConfig): void {
    this.mcpCatalogConfig = config
  }

  getMcpCatalogConfig(): McpCatalogConfig {
    return this.mcpCatalogConfig
  }

  getAppCatalogData(): AppCatalogData {
    return {
      resources: this.resources,
      mcpServers: this.mcpServers,
      tagsDefinitions: this.tagsDefinitions,
      // Same rule as the real loader: the portal rides only on getServiceDesks.
      approvalMethods: this.approvalMethods.map((m) => {
        if (m.type !== 'service' || !m.config.portal) return m
        const { portal: _portal, ...config } = m.config
        return { ...m, config }
      }),
      persons: this.persons,
      groups: this.groups,
    }
  }

  getServiceDesks() {
    return this.approvalMethods.filter(
      (m): m is Extract<typeof m, { type: 'service' }> => m.type === 'service',
    )
  }
}
