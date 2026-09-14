import type { Resource } from '@igstack/app-catalog-backend-core'
import type { MockDb } from '../mock-backend/MockDb'

export class MockBackendVerifier {
  constructor(readonly db: MockDb) {}

  apps(): Resource[] {
    return this.db.getResources()
  }

  getApp(slug: string): Resource {
    return this.db.getResource(slug)
  }
}
