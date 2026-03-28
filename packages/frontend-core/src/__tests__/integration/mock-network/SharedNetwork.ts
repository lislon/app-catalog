import { HttpResponse, http } from 'msw'
import { createTRPCMsw, httpLink } from 'msw-trpc'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { MockService } from '../mock-backend/MockService'
import type { NetworkInterceptor } from './NetworkCatalog'

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
