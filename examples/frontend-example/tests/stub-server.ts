import type { AppCatalogData } from '@igstack/app-catalog-backend-core'
import { initTRPC } from '@trpc/server'
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import type { Server } from 'node:http'

const t = initTRPC.create()

const stubData = {
  resources: [],
  tagsDefinitions: [],
  approvalMethods: [],
  persons: [],
  groups: [],
  versions: {
    backend: { displayName: 'stub' },
    frontend: { displayName: 'e2e-test' },
  },
} satisfies AppCatalogData

const appRouter = t.router({
  appCatalog: t.router({
    getData: t.procedure.query(() => stubData),
  }),
  auth: t.router({
    getProviders: t.procedure.query(() => ({ devLoginEnabled: false })),
  }),
})

let server: Server | undefined

export async function startStubServer(port: number): Promise<void> {
  const httpServer = createHTTPServer({ router: appRouter })
  server = httpServer as unknown as Server
  await new Promise<void>((resolve) => {
    httpServer.listen(port, resolve)
  })
  console.log(`Stub tRPC server listening on port ${port}`)
}

export async function stopStubServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => (err ? reject(err) : resolve()))
    })
    server = undefined
  }
}
