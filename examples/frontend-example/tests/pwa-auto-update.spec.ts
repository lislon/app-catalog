import { expect, test } from '@playwright/test'

test.describe('PWA Auto-Update', () => {
  test('service worker registers on first load', async ({ page }) => {
    await page.goto('/')

    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const reg = await navigator.serviceWorker.ready
      return reg.active !== null
    })

    expect(swActive).toBe(true)
  })

  test('PwaAutoUpdateController attaches visibilitychange listener', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('  [browser]', msg.text()))
    await page.goto('/')

    // Wait for SW to be ready (controller starts after registration)
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })

    // Give React time to mount and controller to start
    await page.waitForTimeout(500)

    // Verify the controller's visibilitychange listener is attached by
    // dispatching the event and checking for the debug log
    const logPromise = page.waitForEvent('console', {
      predicate: (msg) =>
        msg.text().includes('[PWA Auto-Update] Tab became visible'),
      timeout: 5000,
    })

    // Dispatch visibilitychange — in headless Chromium visibilityState is
    // already 'visible', so the controller's handler will proceed past the
    // guard and fire after the 1s debounce
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const msg = await logPromise
    expect(msg.text()).toContain('Tab became visible')
  })

  test('app loads and renders content', async ({ page }) => {
    await page.goto('/')

    await page
      .waitForSelector('[data-testid="user-avatar-button"], a[href="/"]', {
        timeout: 10000,
      })
      .catch(() => {})

    const hasContent = await page.evaluate(() => {
      return document.getElementById('root')?.innerHTML !== ''
    })
    expect(hasContent).toBe(true)
  })
})
