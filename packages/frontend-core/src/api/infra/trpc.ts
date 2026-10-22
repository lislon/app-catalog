import { createTRPCContext } from '@trpc/tanstack-react-query'
import type { TRPCRouter } from '@igstack/app-catalog-backend-core'

const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<TRPCRouter>()

// Re-export with explicit types to avoid portable type errors
export { TRPCProvider, useTRPC, useTRPCClient }
export type { TRPCRouter }
