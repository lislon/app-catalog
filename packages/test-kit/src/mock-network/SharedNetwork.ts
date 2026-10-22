import { HttpResponse, http } from 'msw'
import { createTRPCMsw, httpLink } from 'msw-trpc'
import { TRPCError } from '@trpc/server'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { MockService } from '../mock-backend/MockService'
import type { NetworkInterceptor } from './NetworkCatalog'
import type { MockFeedbackStore } from './MockFeedbackStore'

const trpcMsw = createTRPCMsw<TRPCRouter>({
  links: [httpLink({ url: '/api/trpc' })],
})

// 1x1 transparent PNG placeholder
const PLACEHOLDER_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe5, 0x27,
  0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60,
  0x82,
])

export const SharedNetwork = {
  appCatalogQuery(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['appCatalog-query'],
      handler: trpcMsw.appCatalog.getData.query(() => {
        return service.getAppCatalogData()
      }),
    }
  },

  /**
   * Every opened resource asks for its feedback.
   *
   * The shape is `{ items, openCount }` rather than a bare array, because the open
   * count travels with the list — the badge would otherwise need a second round trip.
   */
  feedbackList(store: MockFeedbackStore): NetworkInterceptor {
    return {
      scopeKey: ['feedback-list'],
      handler: trpcMsw.feedback.list.query(({ input }) => {
        if ('resourceSlug' in input && input.resourceSlug) {
          return store.listFor(input.resourceSlug)
        }
        if ('communityToolSlug' in input && input.communityToolSlug) {
          return store.listFor(input.communityToolSlug)
        }
        return { items: [], openCount: 0 }
      }),
    }
  },

  /** The visitor's own feedback, across entries. Empty means the header renders nothing. */
  feedbackMine(store: MockFeedbackStore): NetworkInterceptor {
    return {
      scopeKey: ['feedback-mine'],
      handler: trpcMsw.feedback.mine.query(() => store.mine()),
    }
  },

  /** Posting a correction, so a scenario can observe its own write. */
  feedbackAdd(store: MockFeedbackStore): NetworkInterceptor {
    return {
      scopeKey: ['feedback-add'],
      handler: trpcMsw.feedback.add.mutation(({ input }) => store.add(input)),
    }
  },

  feedbackEdit(store: MockFeedbackStore): NetworkInterceptor {
    return {
      scopeKey: ['feedback-edit'],
      handler: trpcMsw.feedback.edit.mutation(({ input }) => {
        store.edit(input.id, input.body)
        return { ok: true } as never
      }),
    }
  },

  feedbackDismiss(store: MockFeedbackStore): NetworkInterceptor {
    return {
      scopeKey: ['feedback-dismiss'],
      handler: trpcMsw.feedback.dismiss.mutation(({ input }) => {
        store.dismiss(input.id)
        return { ok: true } as never
      }),
    }
  },

  /**
   * The attachment upload, which is a plain REST route rather than tRPC because it
   * carries multipart bodies.
   */
  feedbackAttachmentUpload(store: MockFeedbackStore): NetworkInterceptor {
    return {
      scopeKey: ['feedback-attachment-upload'],
      handler: http.post(
        /\/api\/feedback-attachments\/upload/,
        async ({ request }) => {
          // Counted off the raw body rather than `request.formData()`.
          //
          // The handler runs on Node's undici, whose multipart parser asserts each
          // part is an undici `File`; a file the page created is a jsdom `File`, a
          // different class, so the assert fails and the request 500s. There is no
          // flag for that — the two realms simply disagree — so the body is read as
          // text, which needs no File at all.
          const raw = await request.text()
          const parts = raw.match(/name="image"/g) ?? []
          return HttpResponse.json({ ids: store.uploadImages(parts.length) })
        },
      ),
    }
  },

  /** The stored image. One transparent pixel — the bytes are not what is under test. */
  feedbackAttachmentBinary(): NetworkInterceptor {
    return {
      scopeKey: ['feedback-attachment-binary'],
      handler: http.get(/\/api\/feedback-attachments\/[^/]+$/, () =>
        HttpResponse.arrayBuffer(PLACEHOLDER_PNG.buffer, {
          headers: { 'Content-Type': 'image/webp' },
        }),
      ),
    }
  },

  authGetSession(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['auth-session'],
      handler: http.get(/\/api\/auth\/session/, () => {
        const session = service.getSessionResponse()
        if (!session) {
          return HttpResponse.json(
            { error: 'Not authenticated' },
            { status: 401 },
          )
        }
        return HttpResponse.json(session)
      }),
    }
  },

  authGetProviders(overrides?: {
    devLoginEnabled?: boolean
  }): NetworkInterceptor {
    return {
      scopeKey: ['auth-providers'],
      handler: trpcMsw.auth.getProviders.query(() => {
        return {
          providers: [] as string[],
          devLoginEnabled: overrides?.devLoginEnabled ?? false,
        }
      }),
    }
  },

  authSignOut(): NetworkInterceptor {
    return {
      scopeKey: ['auth-sign-out'],
      handler: http.post(/\/api\/auth\/sign-out/, () => {
        return HttpResponse.json({ ok: true })
      }),
    }
  },

  authDevLogout(): NetworkInterceptor {
    return {
      scopeKey: ['auth-dev-logout'],
      handler: http.post(/\/api\/auth\/dev-logout/, () => {
        return HttpResponse.json({ ok: true })
      }),
    }
  },

  screenshotBinary(): NetworkInterceptor {
    return {
      scopeKey: ['screenshot'],
      handler: http.get(/\/api\/screenshots\/.*/, () => {
        return new HttpResponse(PLACEHOLDER_PNG, {
          headers: { 'Content-Type': 'image/png' },
        })
      }),
    }
  },

  iconBinary(): NetworkInterceptor {
    return {
      scopeKey: ['icon'],
      handler: http.get(/\/api\/icons\/.*/, () => {
        return new HttpResponse(PLACEHOLDER_PNG, {
          headers: { 'Content-Type': 'image/png' },
        })
      }),
    }
  },

  communityToolsConfig(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-config'],
      handler: trpcMsw.communityTools.config.query(() => {
        return service.communityToolsStore?.config() ?? { enabled: false }
      }),
    }
  },

  communityToolsList(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-list'],
      handler: trpcMsw.communityTools.list.query(() => {
        if (!service.communityToolsStore) return []
        return service.communityToolsStore.list()
      }),
    }
  },

  communityToolsGet(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-get'],
      handler: trpcMsw.communityTools.get.query(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tool not found' })
        }
        const tool = service.communityToolsStore.get(input.slug)
        if (!tool) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Tool not found' })
        }
        return tool
      }),
    }
  },

  communityToolsRecordView(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-record-view'],
      handler: trpcMsw.communityTools.recordView.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'This action needs cookies enabled',
          })
        }
        return service.communityToolsStore.recordView(input.slug)
      }),
    }
  },

  communityToolsRecent(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-recent'],
      handler: trpcMsw.communityTools.recent.query(() => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          return service.communityToolsStore.recent()
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
          }
          throw error
        }
      }),
    }
  },

  communityToolsPins(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-pins'],
      handler: trpcMsw.communityTools.pins.query(() => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          return service.communityToolsStore.pins()
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
          }
          throw error
        }
      }),
    }
  },

  communityToolsPin(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-pin'],
      handler: trpcMsw.communityTools.pin.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          service.communityToolsStore.pin(input.slug)
          return { ok: true } as never
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
          }
          throw error
        }
      }),
    }
  },

  communityToolsUnpin(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-unpin'],
      handler: trpcMsw.communityTools.unpin.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          service.communityToolsStore.unpin(input.slug)
          return { ok: true } as never
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
          }
          throw error
        }
      }),
    }
  },

  communityToolsReorderPins(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-reorder-pins'],
      handler: trpcMsw.communityTools.reorderPins.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          service.communityToolsStore.reorderPins(input.slugs)
          return { ok: true } as never
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            throw new TRPCError({ code: 'UNAUTHORIZED' })
          }
          throw error
        }
      }),
    }
  },

  communityToolsPreview(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-preview'],
      handler: trpcMsw.communityTools.preview.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          return service.communityToolsStore.preview(input.url)
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
              throw new TRPCError({ code: 'UNAUTHORIZED' })
            }
            if (error.message.startsWith('BAD_REQUEST:')) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: error.message.replace('BAD_REQUEST: ', ''),
              })
            }
          }
          throw error
        }
      }),
    }
  },

  communityToolsAdd(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-add'],
      handler: trpcMsw.communityTools.add.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          return service.communityToolsStore.add(input)
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
              throw new TRPCError({ code: 'UNAUTHORIZED' })
            }
            if (error.message.startsWith('BAD_REQUEST:')) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: error.message.replace('BAD_REQUEST: ', ''),
              })
            }
          }
          throw error
        }
      }),
    }
  },

  communityToolsEdit(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-edit'],
      handler: trpcMsw.communityTools.edit.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          return service.communityToolsStore.edit(input)
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
              throw new TRPCError({ code: 'UNAUTHORIZED' })
            }
            if (
              error.message ===
              'FORBIDDEN: Only an owner or an admin can change this tool'
            ) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Only an owner or an admin can change this tool',
              })
            }
            if (error.message === 'NOT_FOUND: Tool not found') {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Tool not found',
              })
            }
            if (error.message.startsWith('BAD_REQUEST:')) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: error.message.replace('BAD_REQUEST: ', ''),
              })
            }
          }
          throw error
        }
      }),
    }
  },

  communityToolsArchive(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-archive'],
      handler: trpcMsw.communityTools.archive.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          service.communityToolsStore.archive(input.slug, input.reason)
          return { ok: true } as never
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
              throw new TRPCError({ code: 'UNAUTHORIZED' })
            }
            if (
              error.message ===
              'FORBIDDEN: Only an owner or an admin can change this tool'
            ) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Only an owner or an admin can change this tool',
              })
            }
            if (error.message === 'NOT_FOUND: Tool not found') {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Tool not found',
              })
            }
          }
          throw error
        }
      }),
    }
  },

  communityToolsApprove(service: MockService): NetworkInterceptor {
    return {
      scopeKey: ['community-tools-approve'],
      handler: trpcMsw.communityTools.approve.mutation(({ input }) => {
        if (!service.communityToolsStore) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        try {
          service.communityToolsStore.approve(input.slug)
          return { ok: true } as never
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'UNAUTHORIZED') {
              throw new TRPCError({ code: 'UNAUTHORIZED' })
            }
            if (error.message === 'FORBIDDEN') {
              throw new TRPCError({ code: 'FORBIDDEN' })
            }
            if (error.message === 'NOT_FOUND: Tool not found') {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Tool not found',
              })
            }
          }
          throw error
        }
      }),
    }
  },
}
