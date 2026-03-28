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

      // Explicit session endpoint handler
      router.get(
        `${basePath}/auth/session`,
        async (req, res): Promise<void> => {
          try {
            // Check if dev mock user is configured
            if (options.auth.devMockUser) {
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
