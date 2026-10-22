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

describe('communityTools router authorization', () => {
  const routerOn = createCommunityToolsRouter({ enabled: true })
  const callerAs = (ctx: { user: { id: string } | null; isAdmin: boolean }) =>
    routerOn.createCaller({ ...ctx, actor: null } as unknown as AcTrpcContext)
  const anonymous = callerAs({ user: null, isAdmin: false })
  const tool = {
    url: 'https://my-tool.pages.example.com/',
    name: 'My Tool',
    summary: '',
    descriptionMd: '',
    ownerSlugs: ['ann@example.com'],
    tags: [],
  }

  it('refuses approve to a signed-in non-admin', async () => {
    const member = callerAs({ user: { id: 'user-2' }, isAdmin: false })
    await expect(member.approve({ slug: 'my-tool' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it.each([
    ['pins', () => anonymous.pins()],
    ['recent', () => anonymous.recent()],
    ['pin', () => anonymous.pin({ slug: 'my-tool' })],
    ['unpin', () => anonymous.unpin({ slug: 'my-tool' })],
    ['reorderPins', () => anonymous.reorderPins({ slugs: ['my-tool'] })],
    ['preview', () => anonymous.preview({ url: tool.url })],
    ['add', () => anonymous.add(tool)],
    ['edit', () => anonymous.edit({ ...tool, slug: 'my-tool' })],
    ['archive', () => anonymous.archive({ slug: 'my-tool', reason: 'Gone' })],
    ['approve', () => anonymous.approve({ slug: 'my-tool' })],
  ])('answers UNAUTHORIZED to an anonymous %s', async (_, call) => {
    await expect(call()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})
