import { HttpResponse, http } from 'msw'
import { createTRPCMsw, httpLink } from 'msw-trpc'
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
      handler: trpcMsw.feedback.list.query(({ input }) =>
        store.listFor(input.resourceSlug),
      ),
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
}
