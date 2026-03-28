import type { AppCatalogData } from '@igstack/app-catalog-backend-core'
import { AcDb, dbCacheDbKeys } from '~/userDb/AcDb'

/**
 * Pre-populate the browser's local state to simulate a returning user.
 * Call before `given()` to set up IndexedDB cache and localStorage flags.
 *
 * Usage:
 *   await browserState.seedCatalogCache(data)
 *   browserState.dismissOnboarding()
 */
export const browserState = {
  /**
   * Seed the IndexedDB cache with app catalog data,
   * as if the user has previously loaded the app.
   */
  async seedCatalogCache(data: AppCatalogData): Promise<void> {
    const db = new AcDb()
    await db.appCatalog.put(data, dbCacheDbKeys.AppCatalog)
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
  async returningUser(data: AppCatalogData): Promise<void> {
    this.dismissOnboarding()
    await this.seedCatalogCache(data)
  },
}
