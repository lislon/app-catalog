/// <reference types="vite-plugin-pwa/client" />

import type { TRPCRouter } from '@igstack/app-catalog-backend-core'
import type { QueryClient } from '@tanstack/react-query'
import type { RouterHistory } from '@tanstack/react-router'
import type { TRPCClient } from '@trpc/client'
import type { EnvHopperHealthStateBootstrapPart } from '~/modules/config/HealthStateContext'
import type { EhPlugin } from '~/modules/pluginCore/types'
import type { AcDb } from '~/userDb/AcDb'

export interface BreadcrumbMeta {
  title: string
  href?: string
}

export interface EhRouterContext {
  queryClient: QueryClient
  trpcClient: TRPCClient<TRPCRouter>
  db: AcDb
  plugins: Array<EhPlugin>
  boostrapHealth: EnvHopperHealthStateBootstrapPart
  meta?: {
    breadcrumb?: BreadcrumbMeta
  }
}

export interface EhRouterInitParams {
  history: RouterHistory
  context: EhRouterContext
}
