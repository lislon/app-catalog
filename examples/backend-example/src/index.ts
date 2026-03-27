import { config as loadEnv } from 'dotenv-defaults'
import express from 'express'
import {
  createAcMiddleware,
  getAssetByName,
  getVersionInfo,
  staticControllerContract,
  syncAppCatalog,
} from '@igstack/app-catalog-backend-core'
import type { Express, Request, Response } from 'express'
import type { AppCatalogCompanySpecificBackend } from '@igstack/app-catalog-backend-core'
import {
  mockAppCatalog,
  mockApprovalMethods,
  mockTagDefinitions,
} from './data/mockData.js'

loadEnv()

// Company-specific backend implementation
const companySpecificBackend: AppCatalogCompanySpecificBackend = {
  // Automatically gets version info from BUILD_PIPELINE_ID/URL and package.json
  getVersionInfo: () => getVersionInfo(),
}

// Create the middleware with all configuration
const eh = await createAcMiddleware({
  basePath: '/api',

  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },

  auth: {
    betterAuthOptions: {
      baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4001',
      secret:
        process.env.BETTER_AUTH_SECRET ||
        'dev-secret-change-in-production-minimum-32-chars!',
      emailAndPassword: { enabled: true },
      session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // Refresh after 1 day
      },
    },
  },

  backend: companySpecificBackend,

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

// Connect to database
await eh.connect()

const port = process.env.PORT || 4001
const server = app.listen(port, async () => {
  console.log(`Example app-catalog listening on port ${port}`)

  // Sync mock data after server is fully running
  console.log('Syncing mock data to database...')
  try {
    await syncAppCatalog(
      mockAppCatalog,
      mockTagDefinitions,
      mockApprovalMethods,
    )
    console.log(`✓ Synced ${mockAppCatalog.length} apps to database`)
  } catch (error) {
    console.error('Failed to sync app catalog:', error)
  }
})

export const viteNodeApp: Express = app
