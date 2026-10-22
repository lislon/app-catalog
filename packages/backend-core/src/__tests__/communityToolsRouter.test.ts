import { describe, expect, it } from 'vitest'
import { createCommunityToolsRouter } from '../modules/communityTools/router'
import type { AcTrpcContext } from '../server/acTrpcContext'

describe('communityTools router when the feature is off', () => {
  // One shape on and off, so clients are typed for every procedure either way.
  const caller = createCommunityToolsRouter().createCaller({
    user: null,
    isAdmin: false,
    actor: null,
  } as unknown as AcTrpcContext)

  it('reports itself disabled', async () => {
    expect(await caller.config()).toEqual({ enabled: false })
  })

  it('answers NOT_FOUND for every other procedure', async () => {
    await expect(caller.list()).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
