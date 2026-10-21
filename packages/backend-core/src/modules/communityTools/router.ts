import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { User } from 'better-auth/types'
import type { CommunityToolsOptions } from '../../middleware/types'
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from '../../server/trpcSetup'
import type { Actor } from '../visitor/visitorIdentity'
import * as service from './service'
import * as write from './writeService'

function requireActor(actor: Actor | null): Actor {
  if (!actor) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This action needs cookies enabled',
    })
  }
  return actor
}

function writerOf(ctx: {
  user: User
  isAdmin: boolean
  actor: Actor | null
}): write.Writer {
  return {
    user: ctx.user,
    isAdmin: ctx.isAdmin,
    actor: requireActor(ctx.actor),
  }
}

/**
 * `options.capturer` is used as given: resolving the playwright default is the caller's
 * job (`createAcMiddleware`), so a router built directly never launches a browser.
 */
export function createCommunityToolsRouter(options?: CommunityToolsOptions) {
  // When disabled, return a minimal router with only config
  if (!options?.enabled) {
    return router({
      config: publicProcedure.query(() => ({ enabled: false })),
    })
  }

  const deps = {
    captureHosts: options.captureHosts ?? [],
    capturer: options.capturer ?? null,
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

    preview: protectedProcedure
      .input(z.object({ url: z.string().max(2000) }))
      .mutation(({ input }) => write.previewTool(input.url, deps)),

    add: protectedProcedure
      .input(write.toolInputSchema)
      .mutation(({ input, ctx }) =>
        write.addTool(input, writerOf(ctx), deps, new Date()),
      ),

    edit: protectedProcedure
      .input(write.toolInputSchema.extend({ slug: z.string() }))
      .mutation(({ input, ctx }) =>
        write.editTool(input, writerOf(ctx), deps, new Date()),
      ),

    archive: protectedProcedure
      .input(
        z.object({
          slug: z.string(),
          reason: z.string().trim().min(1).max(500),
        }),
      )
      .mutation(({ input, ctx }) =>
        write.archiveTool(input.slug, input.reason, writerOf(ctx), new Date()),
      ),

    approve: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(({ input, ctx }) =>
        write.approveTool(input.slug, writerOf(ctx), new Date()),
      ),
  })
}
