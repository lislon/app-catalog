import type { AppCatalogData } from '@igstack/app-catalog-backend-core'
import {
  AcDb,
  dbCacheDbKeys,
} from '@igstack/app-catalog-frontend-core/internal'
import type { CommunityToolsConfig } from '@igstack/app-catalog-frontend-core/internal'

/**
 * Pre-populate the browser's local state to simulate a returning user.
 * Call before `given()` to set up IndexedDB cache and localStorage flags.
 *
 * Usage:
 *   await browserState.seedCatalogCache(data, { enabled: true })
 *   browserState.dismissOnboarding()
 */
export const browserState = {
  /**
   * Seed the IndexedDB cache with app catalog data,
   * as if the user has previously loaded the app.
   */
  async seedCatalogCache(
    data: AppCatalogData,
    communityToolsConfig: CommunityToolsConfig,
  ): Promise<void> {
    const db = new AcDb()
    await db.appCatalog.put(data, dbCacheDbKeys.AppCatalog)
    await db.communityToolsConfig.put(
      communityToolsConfig,
      dbCacheDbKeys.CommunityToolsConfig,
    )
    db.close()
  },

  /**
   * Mark the onboarding card as dismissed in localStorage,
   * as if the user has already seen and closed it.
   */
  dismissOnboarding(): void {
    localStorage.setItem('app-catalog-onboarding-dismissed', 'true')
  },

  /**
   * Simulate a returning user: onboarding dismissed + catalog data cached.
   */
  async returningUser(
    data: AppCatalogData,
    communityToolsConfig: CommunityToolsConfig,
  ): Promise<void> {
    this.dismissOnboarding()
    await this.seedCatalogCache(data, communityToolsConfig)
  },
}
