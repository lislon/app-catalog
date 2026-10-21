import { createRequire } from 'node:module'

export type CaptureResult =
  | { ok: true; png: Buffer; title: string | null; favicon: Buffer | null }
  | { ok: false; error: string }

/**
 * Visits a page and photographs it.
 *
 * Resolves `{ ok: false }` when the page itself failed (no response, an error status, a
 * timeout) — that is the tool's health. Throws when the browser could not be started,
 * which is ours: the health job must not mark every tool broken because Chromium is
 * missing on one pod.
 */
export interface ScreenshotCapturer {
  capture: (url: string) => Promise<CaptureResult>
}

const VIEWPORT = { width: 1280, height: 800 }
const TIMEOUT_MS = 20_000

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
    async capture(url) {
      const { chromium } = await import('playwright-core')
      const browser = await chromium.launch({
        executablePath:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      })
      try {
        const page = await browser.newPage({ viewport: VIEWPORT })
        const response = await page.goto(url, {
          timeout: TIMEOUT_MS,
          waitUntil: 'load',
        })
        if (!response || !response.ok()) {
          return {
            ok: false,
            error: response ? `HTTP ${response.status()}` : 'No response',
          }
        }
        const png = await page.screenshot({ type: 'png' })
        const title = (await page.title()).trim() || null

        // A string, so this file needs no DOM types.
        const iconHref: string | null = await page.evaluate(
          `document.querySelector('link[rel~="icon"]')?.href ?? null`,
        )
        let favicon: Buffer | null = null
        try {
          const icon = await page.request.get(
            iconHref ?? new URL('/favicon.ico', page.url()).href,
            { timeout: 5_000 },
          )
          if (icon.ok()) favicon = await icon.body()
        } catch {
          // No favicon is fine: the card falls back to a monogram.
        }

        return { ok: true, png, title, favicon }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }
      } finally {
        await browser.close()
      }
    },
  }
}
