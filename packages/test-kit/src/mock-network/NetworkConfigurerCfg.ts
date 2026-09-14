import type { NetworkCatalog } from './NetworkCatalog'
import type { MockService } from '../mock-backend/MockService'

export type NetworkOverrideFn = (
  catalog: NetworkCatalog,
  service: MockService,
) => void

/**
 * Data-carrier that collects network override callbacks.
 * Does not execute anything — `given()` applies overrides after building the default catalog.
 */
export class NetworkConfigurerCfg {
  private _overrides: NetworkOverrideFn[] = []

  /** Register a callback to modify the network catalog after default handlers are set up */
  overrideConfig(fn: NetworkOverrideFn): void {
    this._overrides.push(fn)
  }

  get overrides(): NetworkOverrideFn[] {
    return this._overrides
  }
}
