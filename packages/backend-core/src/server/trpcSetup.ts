import { TRPCError, initTRPC } from '@trpc/server'
import type { AcTrpcContext } from './acTrpcContext'

export const t = initTRPC.context<AcTrpcContext>().create({
  errorFormatter({ error, shape }) {
    // A 4xx is the caller's mistake (unknown path, bad input, no session). One
    // plain line on stdout is enough; a stack on stderr would make log collectors
    // file it as status:error next to real failures.
    if (shape.data.httpStatus < 500) {
      console.info(
        `[tRPC] ${error.code} ${shape.data.path ?? '<no path>'}: ${error.message}`,
      )
      return shape
    }
    console.error('[tRPC Error]', {
      path: shape.data.path,
      code: error.code,
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    })
    return shape
  },
})

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

/**
 * Middleware to check if user is an admin
 */
const isAdminMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    })
  }
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

/**
 * Admin procedure that requires admin permissions
 */
export const adminProcedure = t.procedure.use(isAdminMiddleware)

/**
 * Protected procedure that requires authentication (but not admin)
 */
export const protectedProcedure = t.procedure.use(isAuthenticated)
