import { config as loadEnv } from 'dotenv-defaults'
import express from 'express'
import { openai } from '@ai-sdk/openai'
import {
  DEFAULT_ADMIN_SYSTEM_PROMPT,
  createDatabaseTools,
  createEhMiddleware,
  getAssetByName,
  staticControllerContract,
} from '@igstack/app-catalog-backend-core'
import type { Express, Request, Response } from 'express'
import type { AppCatalogCompanySpecificBackend } from '@igstack/app-catalog-backend-core'
import {
  getAdminGroups,
  getAuthPlugins,
  getAuthProviders,
  validateAuthConfig,
} from './config/authProviders.js'

loadEnv()

// Validate auth configuration
validateAuthConfig()

// Company-specific backend implementation
// Optional: implement getApps() to provide app catalog data
const companySpecificBackend: AppCatalogCompanySpecificBackend = {
  // Example: async getApps() { return [...] }
}

// Create the middleware with all configuration
const eh = await createEhMiddleware({
  basePath: '/api',

  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },

  auth: {
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
    secret:
      process.env.BETTER_AUTH_SECRET ||
      'dev-secret-change-in-production-minimum-32-chars!',
    providers: getAuthProviders(),
    plugins: getAuthPlugins(),
    adminGroups: getAdminGroups(),
    sessionExpiresIn: 60 * 60 * 24 * 30, // 30 days
    sessionUpdateAge: 60 * 60 * 24, // Refresh after 1 day
  },

  backend: companySpecificBackend,

  adminChat: {
    model: openai.chat('gpt-4o-mini'),
    systemPrompt: DEFAULT_ADMIN_SYSTEM_PROMPT,
    tools: createDatabaseTools(),
    validateConfig: () => {
      if (!process.env['OPENAI_API_KEY']) {
        throw new Error('OPENAI_API_KEY environment variable is not configured')
      }
    },
  },

  hooks: {
    onRoutesRegistered: (router) => {
      // Legacy icon endpoint at /icon/:icon (for backwards compatibility)
      router.get(
        `/${staticControllerContract.methods.getIcon.url}`,
        async (req: Request<{ icon: string }>, res: Response) => {
          const { icon } = req.params

          if (!icon || !/^[a-z0-9-]+$/i.test(icon)) {
            res.status(400).send('Invalid icon name')
            return
          }

          try {
            const dbIcon = await getAssetByName(icon)

            if (!dbIcon) {
              res.status(404).send('Icon not found')
              return
            }

            res.setHeader('Content-Type', dbIcon.mimeType)
            res.setHeader('Cache-Control', 'public, max-age=86400')
            res.send(dbIcon.content)
          } catch (error) {
            console.error('Error fetching icon:', error)
            res.status(404).send('Icon not found')
          }
        },
      )

      // Backwards compatibility: mount tRPC at /trpc (in addition to /api/trpc)
      // This allows existing frontends to work without changes
      router.use('/trpc', (req, _res, next) => {
        // Rewrite the URL to /api/trpc and let Express handle it
        req.url = `/api/trpc${req.url}`
        next('route')
      })
    },
  },
})

const app = express()

// Mount the middleware
app.use(eh.router)

// Connect and start
await eh.connect()
const port = process.env.PORT || 4001
app.listen(port)
console.log(`Example app-catalog listening on port ${port}`)

export const viteNodeApp: Express = app
