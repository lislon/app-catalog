import type {
  AppApprovalMethod,
  AppCatalogData,
  AppForCatalog,
  GroupingTagDefinition,
  SubResource,
} from '@igstack/app-catalog-backend-core'

export class MockDb {
  apps: AppForCatalog[] = []
  tagsDefinitions: GroupingTagDefinition[] = []
  approvalMethods: AppApprovalMethod[] = []
  subResources: SubResource[] = []

  upsertApp(app: AppForCatalog): void {
    this.apps = [...this.apps.filter((a) => a.id !== app.id), app]
  }

  getApps(): AppForCatalog[] {
    return this.apps
  }

  getApp(slug: string): AppForCatalog {
    const app = this.apps.find((a) => a.slug === slug)
    if (!app) {
      throw new Error(
        `MockDb: app with slug "${slug}" not found. Available: ${this.apps.map((a) => a.slug).join(', ')}`,
      )
    }
    return app
  }

  setTagDefinitions(defs: GroupingTagDefinition[]): void {
    this.tagsDefinitions = defs
  }

  setApprovalMethods(methods: AppApprovalMethod[]): void {
    this.approvalMethods = methods
  }

  addSubResource(sr: SubResource): void {
    this.subResources = [
      ...this.subResources.filter((s) => s.slug !== sr.slug),
      sr,
    ]
  }

  getAppCatalogData(): AppCatalogData {
    return {
      apps: this.apps,
      tagsDefinitions: this.tagsDefinitions,
      approvalMethods: this.approvalMethods,
      persons: [],
      groups: [],
      subResources: this.subResources,
    }
  }
}
