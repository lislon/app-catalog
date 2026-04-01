import type { PwaAutoUpdateOptions, PwaUpdateHandle } from './types'

const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const DEFAULT_MIN_CHECK_INTERVAL_MS = 30 * 1000 // 30 seconds
const VISIBILITY_DEBOUNCE_MS = 1000
const ERROR_UPDATE_WAIT_MS = 3000
const IDLE_POLL_INTERVAL_MS = 10 * 1000 // check idle state every 10s

const USER_ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const

/**
 * Framework-agnostic controller that triggers service worker update checks
 * when the user is idle, switches tabs, or encounters errors.
 */
export class PwaAutoUpdateController {
  private handle: PwaUpdateHandle
  private options: Required<PwaAutoUpdateOptions>

  private lastCheckTimestamp = 0
  private lastActivityTimestamp = Date.now()
  private isReloading = false
  private visibilityDebounceTimer: ReturnType<typeof setTimeout> | undefined
  private idlePollTimer: ReturnType<typeof setInterval> | undefined

  private boundOnVisibilityChange = this.onVisibilityChange.bind(this)
  private boundOnUserActivity = this.onUserActivity.bind(this)

  constructor(handle: PwaUpdateHandle, options?: PwaAutoUpdateOptions) {
    this.handle = handle
    this.options = {
      idleTimeoutMs: options?.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
      minCheckIntervalMs:
        options?.minCheckIntervalMs ?? DEFAULT_MIN_CHECK_INTERVAL_MS,
      debug: options?.debug ?? false,
    }
  }

  start(): void {
    this.log('Starting auto-update controller')

    document.addEventListener('visibilitychange', this.boundOnVisibilityChange)

    for (const event of USER_ACTIVITY_EVENTS) {
      document.addEventListener(event, this.boundOnUserActivity, {
        passive: true,
      })
    }

    this.idlePollTimer = setInterval(() => {
      this.checkIdleState()
    }, IDLE_POLL_INTERVAL_MS)
  }

  destroy(): void {
    this.log('Destroying auto-update controller')

    document.removeEventListener(
      'visibilitychange',
      this.boundOnVisibilityChange,
    )

    for (const event of USER_ACTIVITY_EVENTS) {
      document.removeEventListener(event, this.boundOnUserActivity)
    }

    if (this.visibilityDebounceTimer != null) {
      clearTimeout(this.visibilityDebounceTimer)
      this.visibilityDebounceTimer = undefined
    }

    if (this.idlePollTimer != null) {
      clearInterval(this.idlePollTimer)
      this.idlePollTimer = undefined
    }
  }

  /**
   * Called by the error boundary. Immediately checks for update,
   * waits briefly for a new SW, then reloads regardless.
   */
  async triggerUpdateOnError(): Promise<void> {
    this.log('Error-triggered update check')

    if (this.isReloading) return

    const { registration } = this.handle
    if (registration) {
      try {
        await registration.update()
      } catch {
        this.log('registration.update() failed, reloading anyway')
      }
    }

    // Wait briefly for a new SW to activate, then reload
    await new Promise((resolve) => setTimeout(resolve, ERROR_UPDATE_WAIT_MS))
    this.reload()
  }

  /** Update the handle when registration becomes available async */
  updateHandle(handle: PwaUpdateHandle): void {
    this.handle = handle
  }

  private onVisibilityChange(): void {
    if (document.visibilityState !== 'visible') return

    // Debounce rapid tab switches
    if (this.visibilityDebounceTimer != null) {
      clearTimeout(this.visibilityDebounceTimer)
    }

    this.visibilityDebounceTimer = setTimeout(() => {
      this.visibilityDebounceTimer = undefined
      this.log('Tab became visible, checking for update')
      this.checkForUpdate()
    }, VISIBILITY_DEBOUNCE_MS)
  }

  private onUserActivity(): void {
    this.lastActivityTimestamp = Date.now()
  }

  private checkIdleState(): void {
    const idleTime = Date.now() - this.lastActivityTimestamp
    if (idleTime >= this.options.idleTimeoutMs) {
      this.log(`Idle for ${Math.round(idleTime / 1000)}s, checking for update`)
      this.checkForUpdate()
    }
  }

  private async checkForUpdate(): Promise<void> {
    if (this.isReloading) return

    const now = Date.now()
    if (now - this.lastCheckTimestamp < this.options.minCheckIntervalMs) {
      this.log('Skipping check — too soon since last check')
      return
    }

    const { registration } = this.handle
    if (!registration) {
      this.log('No SW registration available, skipping check')
      return
    }

    this.lastCheckTimestamp = now
    this.log('Calling registration.update()')

    try {
      await registration.update()
    } catch (error) {
      this.log('registration.update() failed:', error)
    }
    // With autoUpdate registerType, vite-plugin-pwa handles
    // skipWaiting + clientsClaim + calling updateSW() automatically
  }

  private reload(): void {
    if (this.isReloading) return
    this.isReloading = true
    this.log('Reloading page')
    this.handle.updateSW(true)
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log('[PWA Auto-Update]', ...args)
    }
  }
}
