import { getAppCatalogData } from '../modules/appCatalog/service'
import type { AppCatalogData } from '../types'

import { createAppCatalogAdminRouter } from '../modules/appCatalogAdmin/appCatalogAdminRouter.js'
import { createApprovalMethodRouter } from '../modules/approvalMethod/approvalMethodRouter.js'
import { createScreenshotRouter } from '../modules/assets/screenshotRouter.js'
import type { BetterAuth } from '../modules/auth/auth'
import { createAuthRouter } from '../modules/auth/authRouter.js'
import { createIconRouter } from '../modules/icons/iconRouter.js'
import { publicProcedure, router, t } from './trpcSetup'

/**
 * Create the main tRPC router with optional auth instance
 * @param auth - Optional Better Auth instance for auth-related queries
 */
export function createTrpcRouter(auth?: BetterAuth) {
  return router({
    authConfig: publicProcedure.query(async ({ ctx }) => {
      return {
        adminGroups: ctx.adminGroups,
      }
    }),

    appCatalog: publicProcedure.query(async (): Promise<AppCatalogData> => {
      return await getAppCatalogData()
    }),

    // Icon management routes
    icon: createIconRouter(),

    // Screenshot management routes
    screenshot: createScreenshotRouter(),

    // App catalog admin routes
    appCatalogAdmin: createAppCatalogAdminRouter(),

    // Approval method routes
    approvalMethod: createApprovalMethodRouter(),

    // Auth routes (requires auth instance)
    auth: createAuthRouter(t, auth),
  })
}

export type TRPCRouter = ReturnType<typeof createTrpcRouter>
