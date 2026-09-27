import type { BetterAuthPlugin } from 'better-auth'
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
    getProviders: publicProcedure.query(() => {
      // Return configured social providers and OAuth providers from plugins
      const providers: string[] = []
      const authOptions = auth?.options

      // Add built-in social providers (github, google, etc.)
      if (authOptions?.socialProviders) {
        const socialProviders = authOptions.socialProviders as Record<
          string,
          unknown
        >
        Object.keys(socialProviders).forEach((key) => {
          if (socialProviders[key]) {
            providers.push(key)
          }
        })
      }

      // Add OAuth providers from plugins (like Okta via genericOAuth). They are
      // absent from socialProviders above: the plugin only merges them into the
      // auth context at init time, not into the static options.
      if (authOptions?.plugins) {
        const plugins = authOptions.plugins
        plugins.forEach((plugin: BetterAuthPlugin) => {
          if (plugin.id !== 'generic-oauth' || !plugin.options?.config) {
            return
          }
          const configs: { providerId?: string }[] = Array.isArray(
            plugin.options.config,
          )
            ? plugin.options.config
            : [plugin.options.config]
          configs.forEach((config) => {
            if (config.providerId) {
              providers.push(config.providerId)
            }
          })
        })
      }

      return { providers, devLoginEnabled: options?.devLoginEnabled ?? false }
    }),
  })
}

export type AuthRouter = ReturnType<typeof createAuthRouter>
