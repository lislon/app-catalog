import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import {
  protectedProcedure,
  publicProcedure,
  router,
} from '../../server/trpcSetup'
import type { Actor } from '../visitor/visitorIdentity'
import * as service from './service'

export interface CommunityToolsOptions {
  enabled: boolean
}

function requireActor(actor: Actor | null): Actor {
  if (!actor) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This action needs cookies enabled',
    })
  }
  return actor
}

export function createCommunityToolsRouter(options?: CommunityToolsOptions) {
  // When disabled, return a minimal router with only config
  if (!options?.enabled) {
    return router({
      config: publicProcedure.query(() => ({ enabled: false })),
    })
  }

  // Full router when enabled
  return router({
    config: publicProcedure.query(() => ({ enabled: true })),

    list: publicProcedure.query(({ ctx }) => {
      return service.listTools(ctx.user, ctx.isAdmin, new Date())
    }),

    get: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input, ctx }) => {
        const tool = await service.getTool(
          input.slug,
          ctx.user,
          ctx.isAdmin,
          new Date(),
        )
        if (!tool) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tool not found',
          })
        }
        return tool
      }),

    recordView: publicProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(({ input, ctx }) => {
        const actor = requireActor(ctx.actor)
        return service.recordView(input.slug, actor, ctx.user, new Date())
      }),

    recent: protectedProcedure.query(({ ctx }) => {
      return service.listRecent(ctx.user.id, ctx.user, ctx.isAdmin, new Date())
    }),

    pins: protectedProcedure.query(({ ctx }) => {
      return service.listPins(ctx.user.id, ctx.user, ctx.isAdmin, new Date())
    }),

    pin: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(({ input, ctx }) => {
        return service.pinTool(input.slug, ctx.user.id)
      }),

    unpin: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(({ input, ctx }) => {
        return service.unpinTool(input.slug, ctx.user.id)
      }),

    reorderPins: protectedProcedure
      .input(z.object({ slugs: z.array(z.string()) }))
      .mutation(({ input, ctx }) => {
        return service.reorderPins(input.slugs, ctx.user.id)
      }),
  })
}
