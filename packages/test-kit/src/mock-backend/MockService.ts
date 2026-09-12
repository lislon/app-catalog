import type { AppCatalogData } from '@igstack/app-catalog-backend-core'
import type { MockDb } from './MockDb'
import type { MockUserContext } from './MockUserContext'

export class MockService {
  constructor(
    readonly db: MockDb,
    readonly userContext: MockUserContext,
  ) {}

  getAppCatalogData(): AppCatalogData {
    return this.db.getAppCatalogData()
  }

  getSessionResponse(): object | null {
    return this.userContext.getSessionResponse()
  }
}
