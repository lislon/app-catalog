import type { TRPCRootObject } from '@trpc/server'
import type { AcTrpcContext } from '../../server/acTrpcContext'
import type { BetterAuth } from './auth'

/**
 * Create auth tRPC procedures
 * @param t - tRPC instance
 * @param auth - Better Auth instance (optional, for future extensions)
 * @returns tRPC router with auth procedures
 */
export function createAuthRouter(
  t: TRPCRootObject<AcTrpcContext, {}, {}>,
  auth?: BetterAuth,
  options?: { devLoginEnabled?: boolean },
) {
  const router = t.router
  const publicProcedure = t.procedure

  return router({
    getSession: publicProcedure.query(async ({ ctx }) => {
      return {
        user: ctx.user ?? null,
        isAuthenticated: !!ctx.user,
        isAdmin: ctx.isAdmin,
      }
    }),
    getProviders: publicProcedure.query(async () => {
      // Read the providers better-auth actually resolved, not the static
      // config. The generic OAuth plugin resolves OIDC discovery once, in its
      // init, and silently skips a provider whose discovery document failed to
      // load -- for the whole life of that process. Deriving the list from the
      // static config would keep offering a sign-in button that answers 404
      // "Provider not found". The resolved context holds both halves: built-in
      // social providers and the generic ones that survived discovery.
      const authContext = await auth?.$context

      return {
        providers: authContext?.socialProviders.map((p) => p.id) ?? [],
        devLoginEnabled: options?.devLoginEnabled ?? false,
      }
    }),
  })
}

export type AuthRouter = ReturnType<typeof createAuthRouter>
