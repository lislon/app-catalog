// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { CapturePage } from '../modules/communityTools/capture'
import {
  allowRequest,
  capturePage,
  chromiumFenceArgs,
  fenceRoute,
  followWithinHosts,
  oneAtATime,
} from '../modules/communityTools/capture'

const HOSTS = ['pages.example.com']
const URL_OK = 'https://my-tool.pages.example.com/'

function fakePage(fields: {
  landedOn?: string
  iconHref?: string | null
  headers?: Record<string, string>
}) {
  const iconBody = Buffer.from('icon')
  const page = {
    setDefaultTimeout: vi.fn(),
    goto: vi.fn().mockResolvedValue({
      ok: () => true,
      status: () => 200,
      headers: () => fields.headers ?? {},
    }),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    url: vi.fn(() => fields.landedOn ?? URL_OK),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('png')),
    title: vi.fn().mockResolvedValue(' My Tool '),
    evaluate: vi.fn().mockResolvedValue(fields.iconHref ?? null),
    request: {
      get: vi.fn().mockResolvedValue({
        ok: () => true,
        body: () => Promise.resolve(iconBody),
      }),
    },
  }
  return { page: page satisfies CapturePage, iconBody }
}

describe('Community tools capture', () => {
  it('fails a page that redirected off the allowed hosts', async () => {
    const { page } = fakePage({ landedOn: 'https://intranet.example.org/' })

    const result = await capturePage(page, URL_OK, HOSTS)

    expect(result).toEqual({
      ok: false,
      error: 'redirected off the allowed hosts',
    })
    expect(page.screenshot).not.toHaveBeenCalled()
  })

  it('skips the favicon fetch for an off-list href', async () => {
    const { page } = fakePage({
      iconHref: 'https://intranet.example.org/x.ico',
    })

    const result = await capturePage(page, URL_OK, HOSTS)

    expect(page.request.get).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: true,
      png: Buffer.from('png'),
      title: 'My Tool',
      favicon: null,
      lastModified: null,
    })
  })

  it('fetches an on-list favicon without following redirects', async () => {
    const { page, iconBody } = fakePage({})

    const result = await capturePage(page, URL_OK, HOSTS)

    expect(page.request.get).toHaveBeenCalledWith(
      'https://my-tool.pages.example.com/favicon.ico',
      { timeout: 5_000, maxRedirects: 0 },
    )
    expect(result.ok && result.favicon).toEqual(iconBody)
  })

  it('bounds every page call with the capture timeout', async () => {
    const { page } = fakePage({})

    await capturePage(page, URL_OK, HOSTS)

    expect(page.setDefaultTimeout).toHaveBeenCalledWith(20_000)
  })

  it('photographs a page once its data has loaded and rendered', async () => {
    const { page } = fakePage({})

    await capturePage(page, URL_OK, HOSTS)

    expect(page.waitForLoadState).toHaveBeenCalledWith('networkidle', {
      timeout: expect.any(Number),
    })
    expect(page.waitForTimeout).toHaveBeenCalledWith(1_500)
    const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
      fn.mock.invocationCallOrder[0]!
    expect(order(page.goto)).toBeLessThan(order(page.waitForLoadState))
    expect(order(page.waitForLoadState)).toBeLessThan(
      order(page.waitForTimeout),
    )
    expect(order(page.waitForTimeout)).toBeLessThan(order(page.screenshot))
  })

  it('reads when the site last changed from its Last-Modified', async () => {
    const { page } = fakePage({
      headers: { 'last-modified': 'Wed, 21 Oct 2026 07:28:00 GMT' },
    })

    const result = await capturePage(page, URL_OK, HOSTS)

    expect(result.ok && result.lastModified).toEqual(
      new Date('2026-10-21T07:28:00Z'),
    )
  })

  it('has no change date for a page without, or with a garbled, Last-Modified', async () => {
    const cases: Record<string, string>[] = [{}, { 'last-modified': 'soon' }]
    for (const headers of cases) {
      const { page } = fakePage({ headers })
      const result = await capturePage(page, URL_OK, HOSTS)
      expect(result.ok && result.lastModified).toBeNull()
    }
  })

  it('photographs a page that never goes quiet', async () => {
    const { page } = fakePage({})
    page.waitForLoadState.mockRejectedValue(new Error('Timeout exceeded'))

    const result = await capturePage(page, URL_OK, HOSTS)

    expect(result.ok).toBe(true)
  })

  it('keeps the waits inside the one capture timeout', async () => {
    const { page } = fakePage({})
    const start = 1_000_000
    const now = vi.spyOn(Date, 'now').mockReturnValue(start)
    // The page took 19 of the 20 seconds to load.
    page.goto.mockImplementation(() => {
      now.mockReturnValue(start + 19_000)
      return Promise.resolve({
        ok: () => true,
        status: () => 200,
        headers: () => ({}),
      })
    })

    try {
      await capturePage(page, URL_OK, HOSTS)
    } finally {
      now.mockRestore()
    }

    expect(page.waitForLoadState).not.toHaveBeenCalled()
    expect(page.waitForTimeout).toHaveBeenCalledWith(1_000)
  })

  it('lets only allowed hosts and inline urls through the browser', () => {
    expect(allowRequest('https://cdn.pages.example.com/a.js', HOSTS)).toBe(true)
    expect(allowRequest('data:image/png;base64,AAAA', HOSTS)).toBe(true)
    expect(
      allowRequest('blob:https://my-tool.pages.example.com/1', HOSTS),
    ).toBe(true)
    expect(allowRequest('http://169.254.169.254/latest/', HOSTS)).toBe(false)
    expect(allowRequest('https://intranet.example.org/', HOSTS)).toBe(false)
  })

  it('never requests a redirect target off the allowed hosts', async () => {
    const fetch = vi.fn().mockResolvedValue({
      status: () => 302,
      headers: () => ({ location: 'http://169.254.169.254/latest/' }),
    })

    const response = await followWithinHosts(fetch, URL_OK, HOSTS)

    expect(response).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('follows a redirect that stays on the allowed hosts', async () => {
    const final = { status: () => 200, headers: () => ({}) }
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: () => 301,
        headers: () => ({ location: '/moved' }),
      })
      .mockResolvedValue(final)

    const response = await followWithinHosts(fetch, URL_OK, HOSTS)

    expect(response).toBe(final)
    expect(fetch).toHaveBeenLastCalledWith(
      'https://my-tool.pages.example.com/moved',
      'get',
    )
  })

  it('keeps the method on 307 and 308, switches to GET on 301-303', async () => {
    const hop = (status: number) => ({
      status: () => status,
      headers: () => ({ location: `/after-${status}` }),
    })
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(hop(307))
      .mockResolvedValueOnce(hop(303))
      .mockResolvedValue({ status: () => 200, headers: () => ({}) })

    await followWithinHosts(fetch, URL_OK, HOSTS)

    expect(fetch.mock.calls.map((c) => c[1])).toEqual(['same', 'same', 'get'])
  })

  it('aborts a request whose fetch fails instead of crashing', async () => {
    const route = {
      url: 'https://dead.pages.example.com/img.png',
      abort: vi.fn().mockResolvedValue(undefined),
      continue: vi.fn(),
      fetch: vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')),
      fulfill: vi.fn(),
    }

    await expect(fenceRoute(route, HOSTS)).resolves.toBeUndefined()

    expect(route.abort).toHaveBeenCalledWith('failed')
    expect(route.fulfill).not.toHaveBeenCalled()
  })

  it('aborts an off-list request without fetching it', async () => {
    const route = {
      url: 'https://intranet.example.org/',
      abort: vi.fn().mockResolvedValue(undefined),
      continue: vi.fn(),
      fetch: vi.fn(),
      fulfill: vi.fn(),
    }

    await fenceRoute(route, HOSTS)

    expect(route.abort).toHaveBeenCalledWith('blockedbyclient')
    expect(route.fetch).not.toHaveBeenCalled()
  })

  it('fences the browser network stack to the capture hosts', () => {
    expect(chromiumFenceArgs(['pages.example.com', 'example.net'])).toEqual([
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE *.pages.example.com, EXCLUDE pages.example.com, EXCLUDE *.example.net, EXCLUDE example.net',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--webrtc-ip-handling-policy=disable_non_proxied_udp',
    ])
  })

  it('drops a host that could inject resolver rules', () => {
    expect(chromiumFenceArgs(['example.com, EXCLUDE *'])[0]).toBe(
      '--host-resolver-rules=MAP * ~NOTFOUND',
    )
  })

  it('runs two concurrent captures one after the other', async () => {
    let running = 0
    let maxRunning = 0
    const slow = vi.fn(async () => {
      running++
      maxRunning = Math.max(maxRunning, running)
      await new Promise((r) => setTimeout(r, 10))
      running--
      return { ok: false as const, error: 'x' }
    })
    const { capture } = oneAtATime(slow)

    await Promise.all([capture(URL_OK, HOSTS), capture(URL_OK, HOSTS)])

    expect(slow).toHaveBeenCalledTimes(2)
    expect(maxRunning).toBe(1)
  })

  it('counts the captures queued behind the running one', async () => {
    let release = () => {}
    const queue = oneAtATime(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: false, error: 'x' })
        }),
    )

    const runs = [1, 2, 3].map(() => queue.capture(URL_OK, HOSTS))
    await vi.waitFor(() => expect(queue.waiting()).toBe(2))
    release()
    await vi.waitFor(() => expect(queue.waiting()).toBe(1))
    release()
    await vi.waitFor(() => expect(queue.waiting()).toBe(0))
    release()
    await Promise.all(runs)
  })

  it('keeps the queue moving after a capture throws', async () => {
    const { capture } = oneAtATime(
      vi
        .fn()
        .mockRejectedValueOnce(new Error('launch failed'))
        .mockResolvedValue({ ok: false, error: 'x' }),
    )

    await expect(capture(URL_OK, HOSTS)).rejects.toThrow('launch failed')
    await expect(capture(URL_OK, HOSTS)).resolves.toEqual({
      ok: false,
      error: 'x',
    })
  })
})
