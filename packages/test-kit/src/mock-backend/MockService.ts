import type {
  AppCatalogData,
  McpCatalogConfigResponse,
} from '@igstack/app-catalog-backend-core'
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

  getServiceDesks() {
    return this.db.getServiceDesks()
  }

  getMcpCatalogConfig(): McpCatalogConfigResponse {
    const config = this.db.getMcpCatalogConfig()
    return {
      ...config,
      sensitiveDataLabel: config.sensitiveDataLabel ?? 'Sensitive data',
    }
  }

  getSessionResponse(): object | null {
    return this.userContext.getSessionResponse()
  }
}
