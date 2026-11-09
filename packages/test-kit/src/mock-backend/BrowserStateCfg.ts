import type { AppCatalogData } from '@igstack/app-catalog-backend-core'

/**
 * Data-carrier that collects browser state configuration.
 * Does not execute anything — `given()` materializes it after backend is ready.
 */
export class BrowserStateCfg {
  private _offlineData = false
  private _editOfflineData: (data: AppCatalogData) => AppCatalogData = (d) => d
  private _onboardingDismissed = false
  private _localStorage = new Map<string, string>()

  /**
   * Seed IndexedDB with current backend data (simulates returning user).
   * `edit` reshapes the cached copy, e.g. to drop a field an older build lacked.
   */
  withOfflineData(edit?: (data: AppCatalogData) => AppCatalogData): void {
    this._offlineData = true
    if (edit) this._editOfflineData = edit
  }

  /** Mark onboarding as dismissed */
  dismissOnboarding(): void {
    this._onboardingDismissed = true
  }

  /** Set an arbitrary localStorage item */
  withLocalStorageItem(key: string, value: string): void {
    this._localStorage.set(key, value)
  }

  // Read-only accessors for given() to materialize
  get shouldSeedOfflineData(): boolean {
    return this._offlineData
  }
  get editOfflineData(): (data: AppCatalogData) => AppCatalogData {
    return this._editOfflineData
  }
  get shouldDismissOnboarding(): boolean {
    return this._onboardingDismissed
  }
  get localStorageItems(): Map<string, string> {
    return this._localStorage
  }
}
