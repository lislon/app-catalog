import { createTRPCContext } from '@trpc/tanstack-react-query'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'

const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<TRPCRouter>()

export { TRPCProvider, useTRPC, useTRPCClient }
