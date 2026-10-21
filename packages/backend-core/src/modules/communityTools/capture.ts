import { createRequire } from 'node:module'
import { isCaptureAllowed } from '@igstack/app-catalog-shared-core'

export type CaptureResult =
  | { ok: true; png: Buffer; title: string | null; favicon: Buffer | null }
  | { ok: false; error: string }

/**
 * Visits a page and photographs it, reaching only `allowedHosts`.
 *
 * Resolves `{ ok: false }` when the page itself failed (no response, an error status, a
 * timeout, a redirect off the list) — that is the tool's health. Throws when the
 * browser could not be started, which is ours: the health job must not mark every tool
 * broken because Chromium is missing on one pod.
 */
export interface ScreenshotCapturer {
  capture: (url: string, allowedHosts: string[]) => Promise<CaptureResult>
}

/** The part of a playwright `Page` a capture uses, so it can be tested without a browser. */
export interface CapturePage {
  setDefaultTimeout: (ms: number) => void
  goto: (
    url: string,
    options: { timeout: number; waitUntil: 'load' },
  ) => Promise<{ ok: () => boolean; status: () => number } | null>
  url: () => string
  screenshot: (options: { type: 'png' }) => Promise<Buffer>
  title: () => Promise<string>
  evaluate: (expression: string) => Promise<unknown>
  request: {
    get: (
      url: string,
      options: { timeout: number; maxRedirects: number },
    ) => Promise<{ ok: () => boolean; body: () => Promise<Buffer> }>
  }
}

const VIEWPORT = { width: 1280, height: 800 }
const TIMEOUT_MS = 20_000

/**
 * Whether the browser may load this URL: navigations, redirects and subresources alike.
 * Inline `data:`/`blob:` URLs reach no host, and pages need them to render.
 */
export function allowRequest(url: string, allowedHosts: string[]): boolean {
  return (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    isCaptureAllowed(url, allowedHosts)
  )
}

const MAX_REDIRECTS = 5

/**
 * Fetches a URL, following redirects only while every hop stays on the allowed hosts.
 * Null when a hop leaves them, or after too many hops; the off-list hop is never requested.
 *
 * Done by hand because Chromium follows a redirect, even one answered through
 * `route.fulfill`, without consulting the route again (measured against a real browser).
 */
export async function followWithinHosts<
  TResponse extends {
    status: () => number
    headers: () => Record<string, string>
  },
>(
  fetch: (url: string) => Promise<TResponse>,
  url: string,
  allowedHosts: string[],
): Promise<TResponse | null> {
  let hop = url
  for (let hops = 0; ; hops++) {
    const response = await fetch(hop)
    const location = response.headers()['location']
    const status = response.status()
    if (status < 300 || status >= 400 || !location) return response
    hop = new URL(location, hop).href
    if (hops >= MAX_REDIRECTS || !isCaptureAllowed(hop, allowedHosts)) {
      return null
    }
  }
}

/** Navigates an already-fenced page and collects the screenshot, title and favicon. */
export async function capturePage(
  page: CapturePage,
  url: string,
  allowedHosts: string[],
): Promise<CaptureResult> {
  page.setDefaultTimeout(TIMEOUT_MS)
  const response = await page.goto(url, {
    timeout: TIMEOUT_MS,
    waitUntil: 'load',
  })
  // The route fence aborts an off-list redirect, but the result must not depend on it.
  if (!isCaptureAllowed(page.url(), allowedHosts)) {
    return { ok: false, error: 'redirected off the allowed hosts' }
  }
  if (!response || !response.ok()) {
    return {
      ok: false,
      error: response ? `HTTP ${response.status()}` : 'No response',
    }
  }
  const png = await page.screenshot({ type: 'png' })
  const title = (await page.title()).trim() || null

  // A string, so this file needs no DOM types.
  const iconHref = await page.evaluate(
    `document.querySelector('link[rel~="icon"]')?.href ?? null`,
  )
  const iconUrl =
    typeof iconHref === 'string'
      ? iconHref
      : new URL('/favicon.ico', page.url()).href
  let favicon: Buffer | null = null
  // `page.request` bypasses the route fence, so the href the page chose is checked here,
  // and a redirect is not followed anywhere.
  if (isCaptureAllowed(iconUrl, allowedHosts)) {
    try {
      const icon = await page.request.get(iconUrl, {
        timeout: 5_000,
        maxRedirects: 0,
      })
      if (icon.ok()) favicon = await icon.body()
    } catch {
      // No favicon is fine: the card falls back to a monogram.
    }
  }

  return { ok: true, png, title, favicon }
}

/** Runs captures one at a time, so concurrent previews cannot start a browser each. */
export function oneAtATime(
  capture: ScreenshotCapturer['capture'],
): ScreenshotCapturer['capture'] {
  let queue: Promise<unknown> = Promise.resolve()
  return (url, allowedHosts) => {
    const run = queue.then(() => capture(url, allowedHosts))
    queue = run.catch(() => undefined)
    return run
  }
}

/**
 * A capturer backed by the optional `playwright-core` peer, or null when it is not
 * installed — the feature then works without screenshots.
 */
export function createPlaywrightCapturer(): ScreenshotCapturer | null {
  try {
    createRequire(import.meta.url).resolve('playwright-core')
  } catch {
    return null
  }

  return {
    capture: oneAtATime(async (url, allowedHosts) => {
      const { chromium } = await import('playwright-core')
      const browser = await chromium.launch({
        executablePath:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      })
      try {
        // A service worker could answer requests the route never sees.
        const context = await browser.newContext({
          viewport: VIEWPORT,
          serviceWorkers: 'block',
        })
        await context.route('**/*', async (route) => {
          const target = route.request().url()
          if (!allowRequest(target, allowedHosts)) {
            await route.abort('blockedbyclient')
          } else if (target.startsWith('data:') || target.startsWith('blob:')) {
            await route.continue()
          } else {
            const response = await followWithinHosts(
              (hop) => route.fetch({ url: hop, maxRedirects: 0 }),
              target,
              allowedHosts,
            )
            if (response) await route.fulfill({ response })
            else await route.abort('blockedbyclient')
          }
        })
        // A screenshot needs no live socket, and `route` does not see them.
        await context.routeWebSocket(/.*/, (ws) => ws.close())
        const page = await context.newPage()
        return await capturePage(page, url, allowedHosts)
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }
      } finally {
        await browser.close()
      }
    }),
  }
}
