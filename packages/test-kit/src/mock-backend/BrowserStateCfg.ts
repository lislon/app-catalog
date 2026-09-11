/**
 * Data-carrier that collects browser state configuration.
 * Does not execute anything — `given()` materializes it after backend is ready.
 */
export class BrowserStateCfg {
  private _offlineData = false
  private _onboardingDismissed = false
  private _localStorage = new Map<string, string>()

  /** Seed IndexedDB with current backend data (simulates returning user) */
  withOfflineData(): void {
    this._offlineData = true
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
  get shouldDismissOnboarding(): boolean {
    return this._onboardingDismissed
  }
  get localStorageItems(): Map<string, string> {
    return this._localStorage
  }
}
