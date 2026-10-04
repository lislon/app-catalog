import type {
  ApprovalMethod,
  Resource,
} from '@igstack/app-catalog-backend-core'
import { describe, expect, it } from 'vitest'
import {
  ROUTE_FREE,
  ROUTE_REQUEST,
  ROUTE_UNDOCUMENTED,
  accessTabLabel,
} from '~/modules/appCatalog/utils/accessTabLabel'

const methods: ApprovalMethod[] = [
  {
    slug: 'access-bot',
    type: 'service',
    displayName: 'Access Bot',
    shortName: 'Bot',
    config: { url: 'https://chat.example/bot' },
  },
  {
    slug: 'long-desk',
    type: 'service',
    // No shortName — the tab has to fall back to this, however long it is.
    displayName: 'Enterprise Business Service Organization',
    config: {},
  },
  {
    slug: 'open',
    type: 'noAccessRequired',
    displayName: 'No Approval Needed',
    config: {},
  },
  { slug: 'custom', type: 'custom', displayName: 'Custom', config: {} },
  { slug: 'unknown', type: 'unknown', displayName: 'Unknown', config: {} },
]

const res = (over: Partial<Resource>): Resource => ({
  id: 'x',
  slug: 'x',
  displayName: 'X',
  ...over,
})

describe('accessTabLabel', () => {
  it('names a service desk by its shortName', () => {
    const label = accessTabLabel(
      res({ accessRequest: { approvalMethodSlug: 'access-bot' } }),
      methods,
    )
    expect(label.route).toBe('Bot')
  })

  it('falls back to displayName when no shortName is set', () => {
    const label = accessTabLabel(
      res({ accessRequest: { approvalMethodSlug: 'long-desk' } }),
      methods,
    )
    expect(label.route).toBe('Enterprise Business Service Organization')
  })

  it('says Free when no request is needed', () => {
    const label = accessTabLabel(
      res({ accessRequest: { approvalMethodSlug: 'open' } }),
      methods,
    )
    expect(label.route).toBe(ROUTE_FREE)
  })

  it('says not documented for an entry with no accessRequest at all', () => {
    expect(accessTabLabel(res({}), methods).route).toBe(ROUTE_UNDOCUMENTED)
  })

  it('says not documented for an explicitly unknown method', () => {
    const label = accessTabLabel(
      res({ accessRequest: { approvalMethodSlug: 'unknown' } }),
      methods,
    )
    expect(label.route).toBe(ROUTE_UNDOCUMENTED)
  })

  // A bare `custom` names no channel and writes down no steps, so it is the
  // same dead end as `unknown` under a different slug.
  it('says not documented for a bare custom method', () => {
    const label = accessTabLabel(
      res({ accessRequest: { approvalMethodSlug: 'custom' } }),
      methods,
    )
    expect(label.route).toBe(ROUTE_UNDOCUMENTED)
  })

  // A slug that resolves to no registered method. The access section renders an
  // essentially empty box in that case, so the tab must not advertise a route.
  it('says not documented when the method slug resolves to nothing', () => {
    const label = accessTabLabel(
      res({ accessRequest: { approvalMethodSlug: 'gone-away' } }),
      methods,
    )
    expect(label.route).toBe(ROUTE_UNDOCUMENTED)
  })

  it('still says request for a dangling slug that does write its steps down', () => {
    const label = accessTabLabel(
      res({
        accessRequest: {
          approvalMethodSlug: 'gone-away',
          comments: 'Ask whoever owns it; the channel moved.',
        },
      }),
      methods,
    )
    expect(label.route).toBe(ROUTE_REQUEST)
  })

  it('says request for a custom method that does write its steps down', () => {
    const label = accessTabLabel(
      res({
        accessRequest: {
          approvalMethodSlug: 'custom',
          comments: 'Ask the team that owns it.',
        },
      }),
      methods,
    )
    expect(label.route).toBe(ROUTE_REQUEST)
  })

  it('says 2 steps for a custom method with follow-up work after approval', () => {
    const label = accessTabLabel(
      res({
        accessRequest: {
          approvalMethodSlug: 'custom',
          comments: 'Ask the owning team.',
          postApprovalInstructions: 'Then install the client.',
        },
      }),
      methods,
    )
    expect(label.route).toBe('2 steps')
  })

  // Children keep access as top-level fields rather than an accessRequest; the
  // card's access section already falls back to them, so the tab must agree or
  // the label contradicts the panel underneath it.
  it('treats a child with only contacts as a request, not as undocumented', () => {
    const label = accessTabLabel(
      res({ parentSlug: 'p', approverSlugs: ['team-a'] }),
      methods,
    )
    expect(label.route).toBe(ROUTE_REQUEST)
  })

  describe('the chip', () => {
    it('counts roles', () => {
      const label = accessTabLabel(
        res({
          accessRequest: {
            approvalMethodSlug: 'access-bot',
            roles: [{ displayName: 'Read' }, { displayName: 'Write' }],
          },
        }),
        methods,
      )
      expect(label.chip).toBe('2 roles')
    })

    it('singularises one role', () => {
      const label = accessTabLabel(
        res({
          accessRequest: {
            approvalMethodSlug: 'access-bot',
            roles: [{ displayName: 'Read' }],
          },
        }),
        methods,
      )
      expect(label.chip).toBe('1 role')
    })

    // The named channel stays as the route and the shape rides in the chip:
    // "there is more to do after approval" is the thing worth knowing on an
    // entry that already tells you where to ask.
    it('prefers the step count over the role count when both apply', () => {
      const label = accessTabLabel(
        res({
          accessRequest: {
            approvalMethodSlug: 'access-bot',
            requestPrompt: 'Requesting access.',
            postApprovalInstructions: 'Then run the CLI login.',
            roles: [{ displayName: 'Read' }, { displayName: 'Write' }],
          },
        }),
        methods,
      )
      expect(label).toEqual({ route: 'Bot', chip: '2 steps' })
    })

    it('is absent when there is nothing to count', () => {
      const label = accessTabLabel(
        res({ accessRequest: { approvalMethodSlug: 'access-bot' } }),
        methods,
      )
      expect(label.chip).toBeUndefined()
    })
  })
})
