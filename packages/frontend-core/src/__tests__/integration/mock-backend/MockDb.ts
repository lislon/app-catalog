import type {
  AppApprovalMethod,
  AppCatalogData,
  AppForCatalog,
  GroupingTagDefinition,
} from '@igstack/app-catalog-backend-core'

export class MockDb {
  apps: AppForCatalog[] = []
  tagsDefinitions: GroupingTagDefinition[] = []
  approvalMethods: AppApprovalMethod[] = []

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

  getAppCatalogData(): AppCatalogData {
    return {
      apps: this.apps,
      tagsDefinitions: this.tagsDefinitions,
      approvalMethods: this.approvalMethods,
    }
  }
}
