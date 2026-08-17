import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { buildPgSslConfig } from './sslConfig'

let prismaClient: PrismaClient | null = null
let pool: pg.Pool | null = null

type PrismaLogOption = NonNullable<
  ConstructorParameters<typeof PrismaClient>[0]
>['log']

/**
 * The schema a deployment should be reading and writing.
 *
 * DB_SCHEMA is set per deployment, so it outranks a schema baked into the app
 * config - otherwise a config that names `public` would pin a preview env back
 * to the shared tables it was meant to be isolated from.
 */
export function resolveDbSchema(configuredSchema?: string): string | undefined {
  return process.env.DB_SCHEMA || configuredSchema || undefined
}

/**
 * `search_path` startup options for a schema-isolated deployment.
 *
 * node-postgres ignores Prisma's `?schema=` URL parameter, so a preview env's
 * schema has to be injected as a connection option instead. This half covers
 * raw SQL and the migrations; Prisma's own queries need the adapter half too,
 * which is why every core connection goes through createCorePrismaClient.
 */
export function buildPgSchemaOptions(configuredSchema?: string): {
  options?: string
} {
  const schema = resolveDbSchema(configuredSchema)
  return schema ? { options: `-c search_path=${schema}` } : {}
}

/**
 * The one way to open a connection to the core database.
 *
 * Schema isolation takes two halves and both live here:
 * - the pool's `search_path`, which raw SQL and the migrations follow;
 * - the adapter's `schema`, which is what Prisma qualifies its table names
 *   with. A client built without it emits `"public"."DbResource"` however
 *   correct the pool's `current_schema()` is, so a preview env silently reads
 *   and overwrites the shared canonical tables.
 *
 * A pool built outside this factory gets neither half, so don't build one.
 */
export function createCorePrismaClient(params: {
  connectionString: string
  configuredSchema?: string
  log?: PrismaLogOption
}): { client: PrismaClient; pool: pg.Pool; schema: string | undefined } {
  const schema = resolveDbSchema(params.configuredSchema)
  // SSL comes from PGSSLMODE/PGSSLROOTCERT via our helper (node-postgres
  // doesn't honor those correctly for a connection-string pool - see
  // buildPgSslConfig).
  const ssl = buildPgSslConfig()
  const newPool = new pg.Pool({
    connectionString: params.connectionString,
    ...(ssl === undefined ? {} : { ssl }),
    ...buildPgSchemaOptions(params.configuredSchema),
  })
  const adapter = new PrismaPg(newPool, { schema })
  const client = new PrismaClient({
    adapter,
    ...(params.log === undefined ? {} : { log: params.log }),
  })
  return { client, pool: newPool, schema }
}

/**
 * Fails a deployment that believes it is schema-isolated but is not.
 *
 * Only speaks up when DB_SCHEMA is set - a plain deployment has no isolation to
 * verify and must never be able to crash-loop on this check. The case worth
 * catching is a missing schema: Postgres silently skips a `search_path` entry
 * that does not exist and falls through to `public`, which is the shared-catalog
 * corruption this is here to prevent.
 */
export async function verifyDbSchema(
  poolToCheck: pg.Pool,
  configuredSchema?: string,
): Promise<void> {
  const expected = process.env.DB_SCHEMA
  const resolved = resolveDbSchema(configuredSchema)
  const result = await poolToCheck.query<{ schema: string | null }>(
    'SELECT current_schema() AS schema',
  )
  const actual = result.rows[0]?.schema ?? null
  console.log(
    `[db] core schema: resolved=${resolved ?? '(none)'} current_schema=${actual ?? '(none)'}`,
  )
  if (!expected) return
  if (actual !== expected) {
    throw new Error(
      `DB_SCHEMA is "${expected}" but the database resolved current_schema() to "${actual}". ` +
        `The schema is most likely missing, so every query would fall through to the shared ` +
        `catalog tables. Migrate this schema before starting the app.`,
    )
  }
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

    const created = createCorePrismaClient({ connectionString: databaseUrl })
    pool = created.pool
    prismaClient = created.client
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
  if (pool) await verifyDbSchema(pool)
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
