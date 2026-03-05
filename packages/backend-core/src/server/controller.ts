import { getAppCatalogData } from '../modules/appCatalog/service'
import type { AppCatalogData } from '../types'

import type { BetterAuth } from '../modules/auth/auth'
import { createAuthRouter } from '../modules/auth/authRouter.js'
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

    appCatalog: publicProcedure.query(
      async ({ ctx }): Promise<AppCatalogData> => {
        const baseData = await getAppCatalogData()
        const appVersion = ctx.companySpecificBackend.getAppVersion?.()
        return {
          ...baseData,
          ...(appVersion && { appVersion }),
        }
      },
    ),

    // Auth routes (requires auth instance)
    auth: createAuthRouter(t, auth),
  })
}

export type TRPCRouter = ReturnType<typeof createTrpcRouter>
