import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory } from '@tanstack/react-router'
import { createTRPCClient, httpLink } from '@trpc/client'
import { QueryClient } from '@tanstack/react-query'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import { setupServer } from 'msw/node'
import type { SetupServer } from 'msw/node'

import { App } from '~/App'
import { AcDb } from '~/userDb/AcDb'
import { createAcRouter } from '~/util/createAcRouter'

import { MockDb } from '../mock-backend/MockDb'
import { MockUserContext } from '../mock-backend/MockUserContext'
import { MockService } from '../mock-backend/MockService'
import {
  MockBackendConfigurer,
  resetConfigurerCounter,
} from '../mock-backend/MockBackendConfigurer'
import { BrowserStateCfg } from '../mock-backend/BrowserStateCfg'
import { NetworkConfigurerCfg } from '../mock-network/NetworkConfigurerCfg'
import type { ConfigurerContext, Magazine } from '../mock-backend/magazines'
import { makeNetworkReplyWithCatalog } from '../mock-network/makeNetworkReplyWithCatalog'
import { MockBackendVerifier } from './MockBackendVerifier'
import { getGlobalError } from '../tools/ErrorTools'
import type { GlobalError } from '../tools/ErrorTools'
import { browserState } from '../tools/BrowserState'
import { CatalogTools } from '../tools/CatalogTools'
import { AppDetailTools } from '../tools/AppDetailTools'
import { GalleryTools } from '../tools/GalleryTools'

export interface GivenResult {
  ui: UiTools
  backend: MockBackendVerifier
}

export interface UiTools {
  catalog: CatalogTools
  app: AppDetailTools
  gallery: GalleryTools
  globalError: () => GlobalError
}

// Track active resources for cleanup
let activeServer: SetupServer | null = null
let activeDb: AcDb | null = null

export async function cleanupTestResources(): Promise<void> {
  if (activeServer) {
    activeServer.close()
    activeServer = null
  }
  if (activeDb) {
    activeDb.close()
    await activeDb.delete()
    activeDb = null
  }
}

export async function given(magazine: Magazine): Promise<GivenResult> {
  // Clean up any previous resources
  await cleanupTestResources()
  resetConfigurerCounter()

  // 1. Create cfg objects (data carriers)
  const db = new MockDb()
  const userContext = new MockUserContext()
  const backendCfg = new MockBackendConfigurer(db, userContext)
  const browserStateCfg = new BrowserStateCfg()
  const networkCfg = new NetworkConfigurerCfg()

  const ctx: ConfigurerContext = { backendCfg, browserStateCfg, networkCfg }

  // 2. Run magazine configurer — populates all three cfg objects
  magazine(ctx)

  // 3. Materialize backend service
  const service = new MockService(db, userContext)

  // 4. Apply browser state using data from backend service
  if (browserStateCfg.shouldDismissOnboarding) {
    browserState.dismissOnboarding()
  }
  if (browserStateCfg.shouldSeedOfflineData) {
    await browserState.seedCatalogCache(service.getAppCatalogData())
  }
  for (const [key, value] of browserStateCfg.localStorageItems) {
    localStorage.setItem(key, value)
  }

  // 5. Build network catalog from backend service, then apply overrides
  const catalog = makeNetworkReplyWithCatalog(service)
  for (const override of networkCfg.overrides) {
    override(catalog, service)
  }

  // 6. Set up MSW server
  const server = setupServer(...catalog.getHandlers())
  server.listen({
    onUnhandledRequest: (req) => {
      console.warn(`[MSW] Unhandled: ${req.method} ${req.url}`)
    },
  })
  activeServer = server

  // 7. Create real app infrastructure
  const trpcClient = createTRPCClient<TRPCRouter>({
    links: [
      httpLink({
        url: 'http://localhost/api/trpc',
      }),
    ],
  })

  const acDb = new AcDb()
  activeDb = acDb
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        meta: { db: acDb, trpcClient },
      },
    },
  })

  const router = createAcRouter({
    history: createMemoryHistory({
      initialEntries: ['/catalog/apps'],
    }),
    context: {
      queryClient,
      trpcClient,
      db: acDb,
      plugins: [],
      boostrapHealth: {},
    },
  })

  // 7b. Seed auth user in localStorage for optimistic rendering
  //     (mirrors real-app behavior where localStorage caches the user after first login)
  const sessionResponse = service.getSessionResponse()
  if (
    sessionResponse &&
    typeof sessionResponse === 'object' &&
    'user' in sessionResponse
  ) {
    localStorage.setItem(
      'ac_auth_user',
      JSON.stringify((sessionResponse as { user: unknown }).user),
    )
  }

  // 8. Render
  render(
    <App
      router={router}
      queryClient={queryClient}
      trpcClient={trpcClient}
      db={acDb}
    />,
  )

  // 9. Wait for initial load (either data loaded or error shown)
  await waitFor(
    () => {
      const hasAlert = screen.queryByRole('alert')
      const hasTable = screen.queryAllByRole('table').length > 0
      const hasSearchbox = screen.queryByLabelText('Search apps')
      const hasTanstackError = document.body.textContent.includes(
        'Something went wrong',
      )
      if (!hasAlert && !hasTable && !hasSearchbox && !hasTanstackError) {
        throw new Error('Still loading...')
      }
    },
    { timeout: 10000 },
  )

  // 10. Return tools
  const backend = new MockBackendVerifier(db)

  const ui: UiTools = {
    catalog: new CatalogTools(),
    app: new AppDetailTools(),
    gallery: new GalleryTools(),
    globalError: () => getGlobalError(),
  }

  return { ui, backend }
}
