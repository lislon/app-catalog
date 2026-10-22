import type { AppCatalogData } from '@igstack/app-catalog-backend-core'
import type { MockFeedbackStore } from '../mock-network/MockFeedbackStore'
import type { MockDb } from './MockDb'
import type { MockUserContext } from './MockUserContext'
import type { MockCommunityToolsStore } from './MockCommunityToolsStore'

export class MockService {
  constructor(
    readonly db: MockDb,
    readonly userContext: MockUserContext,
    readonly feedback: MockFeedbackStore,
    readonly communityTools: MockCommunityToolsStore,
  ) {}

  getAppCatalogData(): AppCatalogData {
    return this.db.getAppCatalogData()
  }

  getSessionResponse(): object | null {
    return this.userContext.getSessionResponse()
  }
}
