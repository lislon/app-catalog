import type { Resource } from '@igstack/app-catalog-backend-core'
import type { MockDb } from '../mock-backend/MockDb'
import type { MockCommunityToolsStore } from '../mock-backend/MockCommunityToolsStore'

export class MockBackendVerifier {
  constructor(
    readonly db: MockDb,
    readonly communityToolsStore?: MockCommunityToolsStore,
  ) {}

  apps(): Resource[] {
    return this.db.getResources()
  }

  getApp(slug: string): Resource {
    return this.db.getResource(slug)
  }
}
