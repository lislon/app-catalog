import type { Router } from 'express'
import { toNodeHandler } from 'better-auth/node'
import type {
  AcFeatureToggles,
  AcMiddlewareOptions,
  MiddlewareContext,
} from './types'
import { registerIconRestController } from '../modules/icons/iconRestController'
import { registerAssetRestController } from '../modules/assets/assetRestController'
import { registerScreenshotRestController } from '../modules/assets/screenshotRestController'
import { createMockSessionResponse } from '../modules/auth/devMockUserUtils'

/** Parse a single cookie value from the Cookie header */
function getCookie(
  req: { headers: { cookie?: string } },
  name: string,
): string | undefined {
  const cookies = req.headers.cookie ?? ''
  if (!cookies) return undefined
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match?.[1] !== undefined ? decodeURIComponent(match[1]) : undefined
}

interface FeatureRegistration {
  name: keyof AcFeatureToggles
  defaultEnabled: boolean
  register: (
    router: Router,
    options: Required<Pick<AcMiddlewareOptions, 'basePath'>> &
      AcMiddlewareOptions,
    context: MiddlewareContext,
  ) => void
}

// Optional features that can be toggled
const FEATURES: FeatureRegistration[] = [
  {
    name: 'auth',
    defaultEnabled: true,
    register: (router, options, ctx) => {
      const basePath = options.basePath

      // Dev mock cookie name — used by dev-login and session endpoints
      const DEV_SESSION_COOKIE = 'ac-dev-session'

      // Explicit session endpoint handler
      router.get(
        `${basePath}/auth/session`,
        async (req, res): Promise<void> => {
          try {
            // Check for dev mock session cookie (set by dev-login endpoint)
            if (
              options.auth.devMockUser &&
              getCookie(req, DEV_SESSION_COOKIE) === '1'
            ) {
              res.json(createMockSessionResponse(options.auth.devMockUser))
              return
            }

            const session = await ctx.auth.api.getSession({
              headers: req.headers as HeadersInit,
            })
            if (session) {
              let admin = false
              if (ctx.isAdmin) {
                try {
                  admin = !!(await ctx.isAdmin(session.user, session.session, {
                    request: req,
                    auth: ctx.auth,
                  }))
                } catch {
                  admin = false
                }
              }
              res.json({ ...session, isAdmin: admin })
            } else {
              res.status(401).json({ error: 'Not authenticated' })
            }
          } catch (error) {
            console.error('[Auth Session Error]', error)
            res.status(500).json({ error: 'Internal server error' })
          }
        },
      )

      // Dev login/logout endpoints (only when devMockUser is configured)
      if (options.auth.devMockUser) {
        const devMockUser = options.auth.devMockUser

        router.post(`${basePath}/auth/dev-login`, (_req, res) => {
          const mockSession = createMockSessionResponse(devMockUser)
          res.cookie(DEV_SESSION_COOKIE, '1', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          })
          res.json(mockSession)
        })

        router.post(`${basePath}/auth/dev-logout`, (_req, res) => {
          res.clearCookie(DEV_SESSION_COOKIE, { path: '/' })
          res.json({ ok: true })
        })
      }

      // Use toNodeHandler to adapt better-auth for Express/Node.js
      const authHandler = toNodeHandler(ctx.auth)
      router.all(`${basePath}/auth/{*any}`, authHandler)
    },
  },
]

/**
 * Registers all enabled features on the router.
 */
export function registerFeatures(
  router: Router,
  options: Required<Pick<AcMiddlewareOptions, 'basePath'>> &
    AcMiddlewareOptions,
  context: MiddlewareContext,
): void {
  const basePath = options.basePath

  // Always-on features (required for core functionality)

  // Icons
  registerIconRestController(router, {
    basePath: `${basePath}/icons`,
  })

  // Assets
  registerAssetRestController(router, {
    basePath: `${basePath}/assets`,
  })

  // Screenshots
  registerScreenshotRestController(router, {
    basePath: `${basePath}/screenshots`,
  })

  // Optional toggleable features
  const toggles = options.features || {}

  for (const feature of FEATURES) {
    const isEnabled = toggles[feature.name] ?? feature.defaultEnabled

    if (isEnabled) {
      feature.register(router, options, context)
    }
  }
}
