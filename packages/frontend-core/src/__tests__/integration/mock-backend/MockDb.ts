import type {
  AppApprovalMethod,
  AppCatalogData,
  AppForCatalog,
  GroupingTagDefinition,
} from '@igstack/app-catalog-backend-core'

export class MockDb {
  apps: Array<AppForCatalog> = []
  tagsDefinitions: Array<GroupingTagDefinition> = []
  approvalMethods: Array<AppApprovalMethod> = []

  upsertApp(app: AppForCatalog): void {
    this.apps = [...this.apps.filter((a) => a.id !== app.id), app]
  }

  getApps(): Array<AppForCatalog> {
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

  setTagDefinitions(defs: Array<GroupingTagDefinition>): void {
    this.tagsDefinitions = defs
  }

  setApprovalMethods(methods: Array<AppApprovalMethod>): void {
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
