import {
  getAppCatalogData,
  updateApp as updateAppService,
} from '../modules/appCatalog/service'
import type { AppCatalogData } from '../types'
import type { AppForCatalog } from '../types/common/appCatalogTypes'

import type { BetterAuth } from '../modules/auth/auth'
import { createAuthRouter } from '../modules/auth/authRouter.js'
import { publicProcedure, router, t } from './trpcSetup'
import { z } from 'zod'

const updateAppInputSchema = z.object({
  id: z.string(),
  data: z
    .object({
      displayName: z.string().optional(),
      alias: z.string().max(20).nullable().optional(),
      slug: z.string().optional(),
      appUrl: z.string().optional(),
      description: z.string().optional(),
      sources: z.array(z.string()).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: 'At least one field required',
    }),
})

/**
 * Create the main tRPC router with optional auth instance
 * @param auth - Optional Better Auth instance for auth-related queries
 */
export function createTrpcRouter(
  auth?: BetterAuth,
  options?: { devLoginEnabled?: boolean },
) {
  return router({
    appCatalog: router({
      getData: publicProcedure.query(
        async ({ ctx }): Promise<AppCatalogData> => {
          const baseData = await getAppCatalogData()
          const versions = await ctx.companySpecificBackend.getVersionInfo?.()

          return {
            ...baseData,
            ...(versions && { versions }),
          }
        },
      ),
      updateApp: publicProcedure
        .input(updateAppInputSchema)
        .mutation(async ({ input }): Promise<AppForCatalog> => {
          return updateAppService(input)
        }),
    }),

    // Auth routes (requires auth instance)
    auth: createAuthRouter(t, auth, options),
  })
}

export type TRPCRouter = ReturnType<typeof createTrpcRouter>
