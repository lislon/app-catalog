/**
 * Handle returned by the consuming app's registerSW() call.
 * The consuming app constructs this from virtual:pwa-register callbacks.
 */
export interface PwaUpdateHandle {
  /** Triggers the service worker update + page reload */
  updateSW: (reloadPage?: boolean) => Promise<void>
  /** The active SW registration, for calling registration.update() */
  registration: ServiceWorkerRegistration | undefined
}

/**
 * Configuration for auto-update behavior.
 */
export interface PwaAutoUpdateOptions {
  /** Milliseconds of idle time before triggering an update check. Default: 300_000 (5 min) */
  idleTimeoutMs?: number
  /** Minimum milliseconds between consecutive SW update checks. Default: 30_000 (30s) */
  minCheckIntervalMs?: number
  /** Log auto-update activity to console. Default: false */
  debug?: boolean
}
