import { describe, expect, it } from 'vitest'
import { TRPCClientError, createTRPCClient, httpLink } from '@trpc/client'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'

import { given, magazine } from '@igstack/app-catalog-test-kit'
import type { Magazine } from '@igstack/app-catalog-test-kit'

// The same client the app gets, so every call below crosses the mock network.
const api = createTRPCClient<TRPCRouter>({
  links: [httpLink({ url: 'http://localhost/api/trpc' })],
})

async function codeOf(call: Promise<unknown>): Promise<string | undefined> {
  const error = await call.then(
    () => undefined,
    (e: unknown) => e,
  )
  return error instanceof TRPCClientError
    ? (error.data as { code?: string } | undefined)?.code
    : undefined
}

function community(extra?: Magazine) {
  return given(magazine.community(extra))
}

const signedInAs =
  (name: string, email: string): Magazine =>
  ({ backendCfg }) =>
    backendCfg.withUser({ name, email, isAuthenticated: true })

describe('the "community" catalog mock', () => {
  it('boots and lists the 3 fixture tools', async () => {
    await community()

    expect(await api.communityTools.config.query()).toEqual({ enabled: true })
    const tools = await api.communityTools.list.query()
    expect(
      tools.map((t) => [t.name, t.views30d, t.viewsAll, t.lifecycle.state]),
    ).toEqual([
      ['Ops Runbook', 412, 1203, 'active'],
      ['Kit Rules Playground', 288, 288, 'active'],
      ['Old Tracker', 22, 22, 'active'],
    ])
    expect(tools[0]).toMatchObject({
      url: 'https://ops-runbook-1a2b.pages.example.com/',
      host: 'ops-runbook-1a2b.pages.example.com',
      owners: [{ slug: 'dana.lee@example.com', name: 'Dana Lee' }],
      tags: [{ kind: 'topic', value: 'runbook' }],
      reviewed: true,
      canEdit: false,
    })
  })

  it('says when a site last changed, and nothing for one that never said', async () => {
    const changed = new Date('2026-10-18T07:28:00.000Z')
    await community(({ backendCfg }) => {
      backendCfg.communityTools.siteUpdated('ops-runbook', changed)
    })

    const tools = await api.communityTools.list.query()
    expect(
      Object.fromEntries(tools.map((t) => [t.slug, t.siteUpdatedAt])),
    ).toEqual({
      'ops-runbook': changed.toISOString(),
      'kit-rules-playground': null,
      'old-tracker': null,
    })
  })

  it('counts likes once per person, names the newest likers, and takes a like back', async () => {
    await community(({ backendCfg }) => {
      backendCfg.communityTools.likedBy('ops-runbook', ['Ann Lee', 'Bo Ray'])
      backendCfg.withUser({
        name: 'Robin Park',
        email: 'robin.park@example.com',
        isAuthenticated: true,
      })
    })
    const likes = async () => {
      const t = await api.communityTools.get.query({ slug: 'ops-runbook' })
      return [t.likes, t.likedByMe, t.likedBy]
    }

    expect(await likes()).toEqual([2, false, ['Bo Ray', 'Ann Lee']])
    await api.communityTools.like.mutate({ slug: 'ops-runbook' })
    await api.communityTools.like.mutate({ slug: 'ops-runbook' })
    // My like is likedByMe; the names stay everyone else's.
    expect(await likes()).toEqual([3, true, ['Bo Ray', 'Ann Lee']])
    await api.communityTools.unlike.mutate({ slug: 'ops-runbook' })
    await api.communityTools.unlike.mutate({ slug: 'ops-runbook' })
    expect(await likes()).toEqual([2, false, ['Bo Ray', 'Ann Lee']])
  })

  it('refuses protected procedures to an anonymous visitor', async () => {
    await community()

    expect(await codeOf(api.communityTools.pins.query())).toBe('UNAUTHORIZED')
    expect(
      await codeOf(api.communityTools.pin.mutate({ slug: 'ops-runbook' })),
    ).toBe('UNAUTHORIZED')
    expect(
      await codeOf(api.communityTools.approve.mutate({ slug: 'ops-runbook' })),
    ).toBe('UNAUTHORIZED')
  })

  it('lets only admins approve, and only editors edit or archive', async () => {
    await community(signedInAs('Robin Park', 'robin.park@example.com'))

    expect(
      await codeOf(api.communityTools.approve.mutate({ slug: 'ops-runbook' })),
    ).toBe('FORBIDDEN')
    expect(
      await codeOf(
        api.communityTools.archive.mutate({ slug: 'ops-runbook', reason: 'x' }),
      ),
    ).toBe('FORBIDDEN')
    // Robin owns Old Tracker through the directory slug, which is their email.
    const own = await api.communityTools.get.query({ slug: 'old-tracker' })
    expect(own.canEdit).toBe(true)
    await api.communityTools.archive.mutate({
      slug: 'old-tracker',
      reason: 'Moved',
    })
    expect(
      (await api.communityTools.get.query({ slug: 'old-tracker' })).lifecycle,
    ).toEqual({
      state: 'archived',
      by: 'person',
      reason: 'Moved',
      at: '2026-10-21T12:00:00.000Z',
      byName: 'Robin Park',
    })
  })

  it('previews the stub page, catches a duplicate host, and publishes for review', async () => {
    await community(signedInAs('Robin Park', 'robin.park@example.com'))

    const preview = await api.communityTools.preview.mutate({
      url: 'https://qc-heatmap-9f8e.pages.example.com/',
    })
    expect(preview).toMatchObject({
      host: 'qc-heatmap-9f8e.pages.example.com',
      title: 'QC Heatmap',
      duplicate: null,
      captureAllowed: true,
    })
    expect(preview.screenshotDataUrl).toMatch(/^data:image\//)

    const dup = await api.communityTools.preview.mutate({
      url: 'https://ops-runbook-1a2b.pages.example.com/other-page',
    })
    expect(dup.duplicate).toEqual({ slug: 'ops-runbook', name: 'Ops Runbook' })

    const added = await api.communityTools.add.mutate({
      url: 'https://qc-heatmap-9f8e.pages.example.com/',
      name: 'QC Heatmap',
      summary: '',
      descriptionMd: '**Per-tile quality** for a run.',
      ownerSlugs: ['sam.ortiz@example.com'],
      tags: [{ kind: 'app', value: 'order-service' }],
    })
    expect(added).toMatchObject({
      slug: 'qc-heatmap',
      reviewed: false,
      addedBy: { name: 'Robin Park' },
      canEdit: true,
    })
    const thread = await api.feedback.list.query({
      communityToolSlug: 'qc-heatmap',
    })
    expect(thread.openCount).toBe(1)
    expect(thread.items[0]?.body).toBe('New tool added: QC Heatmap')

    expect(
      await codeOf(
        api.communityTools.add.mutate({
          url: 'ftp://nope',
          name: 'Nope',
          summary: '',
          descriptionMd: '',
          ownerSlugs: ['sam.ortiz@example.com'],
          tags: [],
        }),
      ),
    ).toBe('BAD_REQUEST')
  })

  it('stores a topic normalised, and two spellings of it once', async () => {
    await community(signedInAs('Robin Park', 'robin.park@example.com'))
    const added = await api.communityTools.add.mutate({
      url: 'https://qc-heatmap-9f8e.pages.example.com/',
      name: 'QC Heatmap',
      summary: '',
      descriptionMd: '',
      ownerSlugs: ['sam.ortiz@example.com'],
      tags: [
        { kind: 'topic', value: 'Plate Maps' },
        { kind: 'topic', value: ' plate-maps' },
      ],
    })
    expect(added.tags).toEqual([{ kind: 'topic', value: 'plate-maps' }])
  })

  it('refuses a tag value longer than 32 characters, as the server does', async () => {
    await community(signedInAs('Robin Park', 'robin.park@example.com'))
    const withTag = (value: string) =>
      api.communityTools.add.mutate({
        url: 'https://qc-heatmap-9f8e.pages.example.com/',
        name: 'QC Heatmap',
        summary: '',
        descriptionMd: '',
        ownerSlugs: ['sam.ortiz@example.com'],
        tags: [{ kind: 'topic', value }],
      })

    expect(await codeOf(withTag('a'.repeat(33)))).toBe('BAD_REQUEST')
    expect((await withTag('a'.repeat(32))).tags).toEqual([
      { kind: 'topic', value: 'a'.repeat(32) },
    ])
  })

  it('an admin approval clears the badge and settles the review rows', async () => {
    await community(({ backendCfg }) => {
      backendCfg.communityTools.seedUnreviewed({
        name: 'QC Heatmap',
        url: 'https://qc-heatmap-9f8e.pages.example.com/',
      })
      backendCfg.withUser({ isAuthenticated: true, isAdmin: true })
    })

    expect(
      (await api.communityTools.get.query({ slug: 'qc-heatmap' })).reviewed,
    ).toBe(false)
    await api.communityTools.approve.mutate({ slug: 'qc-heatmap' })
    expect(
      (await api.communityTools.get.query({ slug: 'qc-heatmap' })).reviewed,
    ).toBe(true)
    expect(
      (await api.feedback.list.query({ communityToolSlug: 'qc-heatmap' }))
        .openCount,
    ).toBe(0)
  })

  it('stores a comment on a tool under that tool', async () => {
    await community()

    await api.feedback.add.mutate({
      communityToolSlug: 'ops-runbook',
      body: 'The link to step 3 is dead.',
    })
    const thread = await api.feedback.list.query({
      communityToolSlug: 'ops-runbook',
    })
    expect(thread.items.map((i) => i.body)).toEqual([
      'The link to step 3 is dead.',
    ])
    expect(
      (await api.feedback.list.query({ communityToolSlug: 'old-tracker' }))
        .items,
    ).toEqual([])
  })

  it('counts failed daily checks on the shared lifecycle rules', async () => {
    await community(({ backendCfg }) => {
      backendCfg.communityTools.failDailyChecks('old-tracker', 3)
      backendCfg.communityTools.failDailyChecks('kit-rules-playground', 30)
    })

    const bySlug = Object.fromEntries(
      (await api.communityTools.list.query()).map((t) => [t.slug, t.lifecycle]),
    )
    expect(bySlug['old-tracker']).toEqual({ state: 'not-working', days: 3 })
    expect(bySlug['kit-rules-playground']).toEqual({
      state: 'archived',
      by: 'auto',
      reason: 'Failed availability checks for 30 days',
      at: '2026-10-21T12:00:00.000Z',
      byName: null,
    })
  })

  it('keeps pins per signed-in user, and counts views', async () => {
    await community(({ backendCfg }) => {
      backendCfg.withUser({ isAuthenticated: true })
      backendCfg.communityTools.seedPin('ops-runbook')
      backendCfg.communityTools.tagWithApp('ops-runbook', 'order-service')
    })

    await api.communityTools.pin.mutate({ slug: 'old-tracker' })
    await api.communityTools.reorderPins.mutate({ slugs: ['old-tracker'] })
    expect((await api.communityTools.pins.query()).map((t) => t.slug)).toEqual([
      'old-tracker',
      'ops-runbook',
    ])

    const views = await api.communityTools.recordView.mutate({
      slug: 'ops-runbook',
    })
    expect(views).toEqual({ views30d: 413, viewsAll: 1204 })
    expect(
      (await api.communityTools.get.query({ slug: 'ops-runbook' })).tags,
    ).toContainEqual({ kind: 'app', value: 'order-service' })
  })

  it('answers NOT_FOUND for an unknown pin, and pins a pinned tool once', async () => {
    await community(({ backendCfg }) => {
      backendCfg.withUser({ isAuthenticated: true })
    })

    expect(await codeOf(api.communityTools.pin.mutate({ slug: 'nope' }))).toBe(
      'NOT_FOUND',
    )
    expect(
      await codeOf(api.communityTools.unpin.mutate({ slug: 'nope' })),
    ).toBe('NOT_FOUND')
    await api.communityTools.pin.mutate({ slug: 'ops-runbook' })
    await api.communityTools.pin.mutate({ slug: 'ops-runbook' })
    expect((await api.communityTools.pins.query()).map((t) => t.slug)).toEqual([
      'ops-runbook',
    ])
  })

  it('takes owners outside the directory by name, 1 to 5 owners in all', async () => {
    await community(signedInAs('Robin Park', 'robin.park@example.com'))
    const input = {
      url: 'https://qc-heatmap-9f8e.pages.example.com/',
      name: 'QC Heatmap',
      summary: '',
      descriptionMd: '',
      tags: [],
    }
    const add = (ownerSlugs: string[], ownerNames: string[]) =>
      api.communityTools.add.mutate({ ...input, ownerSlugs, ownerNames })

    expect(await codeOf(add([], []))).toBe('BAD_REQUEST')
    expect(
      await codeOf(add(['robin.park@example.com'], ['A', 'B', 'C', 'D', 'E'])),
    ).toBe('BAD_REQUEST')
    expect((await add([], ['Kim Outside'])).owners).toEqual([
      { slug: null, name: 'Kim Outside' },
    ])
  })

  it("never lets a named owner edit, even one who shares a person's name", async () => {
    await community(({ backendCfg }) => {
      backendCfg.communityTools.seed({
        name: 'Named Only',
        url: 'https://named-only.pages.example.com/',
        ownerNames: ['Dana Lee'],
      })
      backendCfg.withUser({
        name: 'Dana Lee',
        email: 'dana.lee@example.com',
        isAuthenticated: true,
      })
    })
    const tool = await api.communityTools.get.query({ slug: 'named-only' })
    expect(tool.owners).toEqual([{ slug: null, name: 'Dana Lee' }])
    expect(tool.canEdit).toBe(false)
  })

  it('an edit waits for review again, and a new host starts health over', async () => {
    let store: Parameters<Magazine>[0]['backendCfg']['communityTools'] | null =
      null
    await community(({ backendCfg }) => {
      store = backendCfg.communityTools
      backendCfg.communityTools.failDailyChecks('old-tracker', 30)
      backendCfg.withUser({
        name: 'Robin Park',
        email: 'robin.park@example.com',
        isAuthenticated: true,
      })
    })
    const before = await api.communityTools.get.query({ slug: 'old-tracker' })
    expect(before.lifecycle).toMatchObject({ state: 'archived', by: 'auto' })

    const after = await api.communityTools.edit.mutate({
      slug: 'old-tracker',
      url: 'https://moved-tracker.pages.example.com/',
      name: before.name,
      summary: before.summary,
      descriptionMd: before.descriptionMd,
      ownerSlugs: before.owners.flatMap((o) => (o.slug ? [o.slug] : [])),
      tags: before.tags,
    })

    expect(after).toMatchObject({
      reviewed: false,
      lifecycle: { state: 'active' },
    })
    expect(store!.inspect('Old Tracker')).toMatchObject({
      failingSince: null,
      lastCheckAt: null,
    })
  })

  it("keeps a tool's review line out of its writer's hands", async () => {
    await community(signedInAs('Robin Park', 'robin.park@example.com'))
    await api.communityTools.add.mutate({
      url: 'https://qc-heatmap-9f8e.pages.example.com/',
      name: 'QC Heatmap',
      summary: '',
      descriptionMd: '',
      ownerSlugs: ['robin.park@example.com'],
      tags: [],
    })

    const [line] = (
      await api.feedback.list.query({ communityToolSlug: 'qc-heatmap' })
    ).items
    expect(line).toMatchObject({ isSystem: true, isMine: false })
    expect(await codeOf(api.feedback.dismiss.mutate({ id: line!.id }))).toBe(
      'FORBIDDEN',
    )
    expect(await api.feedback.mine.query()).toEqual([])
  })

  it('refuses a preview while more than three captures wait', async () => {
    const url = 'https://slow-tool-4b4b.pages.example.com/'
    await community(({ backendCfg }) => {
      backendCfg.communityTools.withPage(url, 'Slow Tool', 50)
      backendCfg.withUser({ isAuthenticated: true })
    })

    const queued = Array.from({ length: 4 }, () =>
      api.communityTools.preview.mutate({ url }),
    )
    // Let the four reach the mock before the fifth.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(await codeOf(api.communityTools.preview.mutate({ url }))).toBe(
      'TOO_MANY_REQUESTS',
    )
    await Promise.all(queued)
  })

  it('answers NOT_FOUND for everything but config when the feature is off', async () => {
    await given(magazine.full())

    expect(await api.communityTools.config.query()).toEqual({ enabled: false })
    expect(await codeOf(api.communityTools.list.query())).toBe('NOT_FOUND')
  })
})
