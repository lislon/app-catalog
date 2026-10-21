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
const HOP_TIMEOUT_MS = 10_000
/** Hops a browser repeats as a bodyless GET; 307 and 308 keep the method and body. */
const REDIRECTS_TO_GET = [301, 302, 303]

/** `same` repeats the original method and body; `get` is a bodyless GET. */
export type HopMode = 'same' | 'get'

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
  fetch: (url: string, mode: HopMode) => Promise<TResponse>,
  url: string,
  allowedHosts: string[],
): Promise<TResponse | null> {
  let hop = url
  let mode: HopMode = 'same'
  for (let hops = 0; ; hops++) {
    const response = await fetch(hop, mode)
    const location = response.headers()['location']
    const status = response.status()
    if (status < 300 || status >= 400 || !location) return response
    if (REDIRECTS_TO_GET.includes(status)) mode = 'get'
    hop = new URL(location, hop).href
    if (hops >= MAX_REDIRECTS || !isCaptureAllowed(hop, allowedHosts)) {
      return null
    }
  }
}

/** The parts of a playwright `Route` the fence uses, so it can be tested without a browser. */
export interface FenceRoute<TResponse> {
  url: string
  abort: (code: 'blockedbyclient' | 'failed') => Promise<void>
  continue: () => Promise<void>
  fetch: (url: string, mode: HopMode) => Promise<TResponse>
  fulfill: (response: TResponse) => Promise<void>
}

/**
 * Answers one browser request: off-list is aborted, on-list is fetched hop by hop.
 *
 * Never rejects. A rejection in a route handler surfaces as an unhandledRejection and
 * exits Node (measured), so one dead image on a tool's page would take the pod down.
 */
export async function fenceRoute<
  TResponse extends {
    status: () => number
    headers: () => Record<string, string>
  },
>(route: FenceRoute<TResponse>, allowedHosts: string[]): Promise<void> {
  try {
    if (!allowRequest(route.url, allowedHosts)) {
      await route.abort('blockedbyclient')
    } else if (route.url.startsWith('data:') || route.url.startsWith('blob:')) {
      await route.continue()
    } else {
      const response = await followWithinHosts(
        route.fetch,
        route.url,
        allowedHosts,
      )
      if (response) await route.fulfill(response)
      else await route.abort('blockedbyclient')
    }
  } catch {
    await route.abort('failed').catch(() => undefined)
  }
}

/**
 * Chromium flags that fence the network stack itself, below anything a page can reach:
 * every name but the capture hosts fails to resolve (IP literals included), which also
 * covers worker fetches and sockets that `route` never sees; WebRTC gets no direct UDP.
 * A host that is not a plain name is dropped, so config cannot inject resolver rules.
 */
export function chromiumFenceArgs(allowedHosts: string[]): string[] {
  const rules = [
    'MAP * ~NOTFOUND',
    ...allowedHosts
      .filter((host) => /^[a-z0-9.-]+$/i.test(host))
      .flatMap((host) => [`EXCLUDE *.${host}`, `EXCLUDE ${host}`]),
  ]
  return [
    `--host-resolver-rules=${rules.join(', ')}`,
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--webrtc-ip-handling-policy=disable_non_proxied_udp',
  ]
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
      // Launched per capture because the fence flags depend on the hosts; the queue
      // keeps that to one browser at a time.
      const browser = await chromium.launch({
        executablePath:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        args: chromiumFenceArgs(allowedHosts),
      })
      try {
        // A service worker could answer requests the route never sees.
        const context = await browser.newContext({
          viewport: VIEWPORT,
          serviceWorkers: 'block',
        })
        // Second layer under the resolver fence: per-request and per-hop checks.
        await context.route('**/*', (route) =>
          fenceRoute(
            {
              url: route.request().url(),
              abort: (code) => route.abort(code),
              continue: () => route.continue(),
              fetch: (hop, mode) =>
                mode === 'get'
                  ? context.request.get(hop, {
                      maxRedirects: 0,
                      timeout: HOP_TIMEOUT_MS,
                    })
                  : route.fetch({
                      url: hop,
                      maxRedirects: 0,
                      timeout: HOP_TIMEOUT_MS,
                    }),
              fulfill: (response) => route.fulfill({ response }),
            },
            allowedHosts,
          ),
        )
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
