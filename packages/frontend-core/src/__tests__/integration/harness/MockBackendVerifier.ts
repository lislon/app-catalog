import type { AppForCatalog } from '@igstack/app-catalog-backend-core'
import type { MockDb } from '../mock-backend/MockDb'

export class MockBackendVerifier {
  constructor(readonly db: MockDb) {}

  apps(): Array<AppForCatalog> {
    return this.db.getApps()
  }

  getApp(slug: string): AppForCatalog {
    return this.db.getApp(slug)
  }
}
