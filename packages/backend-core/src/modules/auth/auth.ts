import type { BetterAuthOptions } from 'better-auth'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { getDbClient } from '../../db'

 
export type BetterAuth = ReturnType<typeof betterAuth<any>>

export function createAuth(options: BetterAuthOptions): BetterAuth {
  const prisma = getDbClient()
  return betterAuth({
    ...options,
    basePath: '/api/auth',
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
  })
}
