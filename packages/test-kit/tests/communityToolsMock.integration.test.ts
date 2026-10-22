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

  it('keeps pins and recents per signed-in user', async () => {
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

    await api.communityTools.recordView.mutate({ slug: 'kit-rules-playground' })
    const views = await api.communityTools.recordView.mutate({
      slug: 'ops-runbook',
    })
    expect(views).toEqual({ views30d: 413, viewsAll: 1204 })
    expect(
      (await api.communityTools.recent.query()).map((t) => t.slug),
    ).toEqual(['ops-runbook', 'kit-rules-playground'])
    expect(
      (await api.communityTools.get.query({ slug: 'ops-runbook' })).tags,
    ).toContainEqual({ kind: 'app', value: 'order-service' })
  })

  it('answers NOT_FOUND for everything but config when the feature is off', async () => {
    await given(magazine.full())

    expect(await api.communityTools.config.query()).toEqual({ enabled: false })
    expect(await codeOf(api.communityTools.list.query())).toBe('NOT_FOUND')
  })
})
