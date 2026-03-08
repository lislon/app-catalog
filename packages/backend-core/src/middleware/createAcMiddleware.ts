import express, { Router } from 'express'
import * as trpcExpress from '@trpc/server/adapters/express'
import type {
  AcMiddlewareOptions,
  AcMiddlewareResult,
  MiddlewareContext,
} from './types'
import { AcDatabaseManager } from './database'
import { createBackendResolver } from './backendResolver'
import { registerFeatures } from './featureRegistry'
import { createTrpcRouter } from '../server/controller'
import { createAcTrpcContext } from '../server/acTrpcContext'
import { createAuth } from '../modules/auth/auth'
import { createMockUserFromDevConfig } from '../modules/auth/devMockUserUtils'

export async function createAcMiddleware(
  options: AcMiddlewareOptions,
): Promise<AcMiddlewareResult> {
  // Normalize options with defaults
  const basePath = options.basePath ?? '/api'
  const normalizedOptions = { ...options, basePath }

  // Initialize database manager
  const dbManager = new AcDatabaseManager(options.database)
  // Initialize the client (which also sets the global singleton)
  dbManager.getClient()

  // Create auth instance
  const auth = createAuth(options.auth.betterAuthOptions)

  // Create tRPC router
  const trpcRouter = createTrpcRouter(auth)

  // Normalize backend provider to async factory function
  const resolveBackend = createBackendResolver(options.backend)

  // Create tRPC context factory
  const createContext = async ({
    req,
  }: trpcExpress.CreateExpressContextOptions) => {
    const companySpecificBackend = await resolveBackend()

    let user = null
    let isAdmin = false

    // Check if dev mock user is configured
    if (options.auth.devMockUser) {
      user = createMockUserFromDevConfig(options.auth.devMockUser)
      isAdmin = true // dev mock always admin
    } else {
      // Extract user from session
      try {
        const session = await auth.api.getSession({
          headers: req.headers as HeadersInit,
        })
        user = session?.user ?? null

        // Compute isAdmin via callback
        if (user && session && options.auth.isAdmin) {
          try {
            isAdmin = !!(await options.auth.isAdmin(user, session.session, {
              request: req,
              auth,
            }))
          } catch (error) {
            console.error('[tRPC Context] isAdmin callback failed:', error)
            isAdmin = false
          }
        }
      } catch (error) {
        console.error('[tRPC Context] Failed to get session:', error)
      }
    }

    return createAcTrpcContext({
      companySpecificBackend,
      user,
      isAdmin,
    })
  }

  // Create Express router
  const router = Router()
  router.use(express.json())

  // Build middleware context for feature registration
  const middlewareContext: MiddlewareContext = {
    auth,
    trpcRouter,
    createContext: async () => {
      const companySpecificBackend = await resolveBackend()
      return createAcTrpcContext({
        companySpecificBackend,
      })
    },
    isAdmin: options.auth.isAdmin,
  }

  // Register tRPC middleware (if enabled)
  if (normalizedOptions.features?.trpc !== false) {
    router.use(
      `${basePath}/trpc`,
      trpcExpress.createExpressMiddleware({
        router: trpcRouter,
        createContext,
      }),
    )
  }

  // Register all enabled features
  registerFeatures(router, normalizedOptions, middlewareContext)

  // Call onRoutesRegistered hook if provided
  if (options.hooks?.onRoutesRegistered) {
    await options.hooks.onRoutesRegistered(router)
  }

  return {
    router,
    auth,
    trpcRouter,

    async connect(): Promise<void> {
      await dbManager.connect()
      if (options.hooks?.onDatabaseConnected) {
        await options.hooks.onDatabaseConnected()
      }
    },

    async disconnect(): Promise<void> {
      if (options.hooks?.onDatabaseDisconnecting) {
        await options.hooks.onDatabaseDisconnecting()
      }
      await dbManager.disconnect()
    },

    addRoutes(callback: (router: Router) => void): void {
      callback(router)
    },
  }
}
