import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import type { AcDatabaseConfig } from './types'
import { buildPgSchemaOptions, setDbClient } from '../db/client'
import { buildPgSslConfig } from '../db/sslConfig'

/**
 * Formats a database connection URL from structured config.
 */
function formatConnectionUrl(config: AcDatabaseConfig): string {
  if ('url' in config) {
    return config.url
  }

  const { host, port, database, username, password, schema = 'public' } = config
  return `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=${schema}`
}

/**
 * Internal database manager used by the middleware.
 * Handles connection URL formatting and lifecycle.
 */
export class AcDatabaseManager {
  private client: PrismaClient | null = null
  private pool: pg.Pool | null = null
  private config: AcDatabaseConfig

  constructor(config: AcDatabaseConfig) {
    this.config = config
  }

  /**
   * Get or create the Prisma client instance.
   * Uses lazy initialization for flexibility.
   */
  getClient(): PrismaClient {
    if (!this.client) {
      const datasourceUrl = formatConnectionUrl(this.config)

      // Prisma 7 with adapter: Create pg pool and wrap with adapter.
      // SSL from PGSSLMODE/PGSSLROOTCERT via buildPgSslConfig (node-postgres
      // doesn't apply those correctly to a connection-string pool).
      // This pool - not getDbClient()'s - is the one the app ends up using, so
      // the preview-env schema has to be applied here as well. The `?schema=`
      // in datasourceUrl is inert: node-postgres drops unknown URL params.
      const ssl = buildPgSslConfig()
      this.pool = new pg.Pool({
        connectionString: datasourceUrl,
        ...(ssl === undefined ? {} : { ssl }),
        ...buildPgSchemaOptions(
          'url' in this.config ? undefined : this.config.schema,
        ),
      })
      const adapter = new PrismaPg(this.pool)

      this.client = new PrismaClient({
        adapter,
        log:
          process.env.NODE_ENV === 'development'
            ? ['warn', 'error']
            : ['warn', 'error'],
      })

      // Bridge with existing backend-core getDbClient() usage
      setDbClient(this.client)
    }
    return this.client
  }

  async connect(): Promise<void> {
    const client = this.getClient()
    await client.$connect()
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect()
      this.client = null
    }
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }
}
