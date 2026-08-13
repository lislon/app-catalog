import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { buildPgSslConfig } from './sslConfig'

let prismaClient: PrismaClient | null = null
let pool: pg.Pool | null = null

/**
 * `search_path` startup options for a schema-isolated deployment.
 *
 * node-postgres ignores Prisma's `?schema=` URL parameter, so a preview env's
 * schema has to be injected as a connection option instead. Every pool that
 * talks to the core database must go through here - one that skips it silently
 * lands in `public` and reads the shared canonical tables.
 */
export function buildPgSchemaOptions(
  schema: string | undefined = process.env.DB_SCHEMA,
): { options?: string } {
  return schema ? { options: `-c search_path=${schema}` } : {}
}

/**
 * Gets the internal Prisma client instance.
 * Creates one if it doesn't exist.
 */
export function getDbClient(): PrismaClient {
  if (!prismaClient) {
    const databaseUrl = process.env.AC_CORE_DATABASE_URL
    if (!databaseUrl) {
      throw new Error(
        'PrismaClient not initialized. You must call createAcMiddleware() before using database functions, ' +
          'or set AC_CORE_DATABASE_URL environment variable for standalone usage.',
      )
    }

    // Prisma 7 with adapter: Create pg pool and wrap with adapter.
    // SSL comes from PGSSLMODE/PGSSLROOTCERT via our helper (node-postgres
    // doesn't honor those correctly for a connection-string pool — see
    // buildPgSslConfig).
    //
    // Schema isolation for preview envs (#44): see buildPgSchemaOptions.
    const ssl = buildPgSslConfig()
    pool = new pg.Pool({
      connectionString: databaseUrl,
      ...(ssl === undefined ? {} : { ssl }),
      ...buildPgSchemaOptions(),
    })
    const adapter = new PrismaPg(pool)

    prismaClient = new PrismaClient({ adapter })
  }
  return prismaClient
}

/**
 * Sets the internal Prisma client instance.
 * Used by middleware to bridge with existing getDbClient() usage.
 */
export function setDbClient(client: PrismaClient): void {
  prismaClient = client
}

/**
 * Connects to the database.
 * Call this before performing database operations.
 */
export async function connectDb(): Promise<void> {
  const client = getDbClient()
  await client.$connect()
}

/**
 * Disconnects from the database.
 * Call this when done with database operations (e.g., in scripts).
 */
export async function disconnectDb(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect()
    prismaClient = null
  }
  if (pool) {
    await pool.end()
    pool = null
  }
}
