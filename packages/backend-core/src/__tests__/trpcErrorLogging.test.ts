import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import type { AcTrpcContext } from '../server/acTrpcContext'
import { publicProcedure, router } from '../server/trpcSetup'

// Every tRPC error passes through the errorFormatter in trpcSetup. A client mistake
// (bad path, bad input, no session) must not reach the log as an error with a stack:
// log collectors turn stderr into status:error and a probe at a guessed URL then
// pollutes the same alerting a real failure feeds.
const appRouter = router({
  boom: publicProcedure.query(() => {
    throw new Error('db exploded')
  }),
})

function call(path: string) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: new Request(`http://localhost/api/trpc/${path}`),
    router: appRouter,
    createContext: () => ({}) as AcTrpcContext,
  })
}

describe('tRPC error logging', () => {
  let error: MockInstance
  let info: MockInstance

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => {})
    info = vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs an unknown procedure path as one info line, not an error', async () => {
    const res = await call('appCatalog.getVersionInfo')

    expect(res.status).toBe(404)
    expect(error).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('NOT_FOUND "appCatalog.getVersionInfo"'),
    )
  })

  it('keeps a caller-supplied newline out of the log line', async () => {
    // The path is URL-decoded before it reaches the formatter, so without
    // escaping a request could inject a second, forged record.
    const res = await call('x%0A[tRPC Error] forged')

    expect(res.status).toBe(404)
    expect(error).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledTimes(1)
    const line: string = info.mock.calls[0]?.[0]
    expect(line).not.toContain('\n')
    expect(line).toContain('x\\n[tRPC Error] forged')
  })

  it('keeps a procedure failure at error level with its stack', async () => {
    const res = await call('boom')

    expect(res.status).toBe(500)
    expect(info).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(
      '[tRPC Error]',
      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        path: 'boom',
        message: 'db exploded',
        stack: expect.stringContaining('    at '),
      }),
    )
  })
})
