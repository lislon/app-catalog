import type { PrismaClient } from '../generated/prisma/client'
import type pg from 'pg'
import type { AcDatabaseConfig } from './types'
import {
  createCorePrismaClient,
  setDbClient,
  verifyDbSchema,
} from '../db/client'

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
      // This client - not getDbClient()'s - is the one the app ends up using.
      // The `?schema=` in the url is inert (node-postgres drops unknown URL
      // params), so the schema has to travel via createCorePrismaClient.
      const created = createCorePrismaClient({
        connectionString: formatConnectionUrl(this.config),
        configuredSchema: this.configuredSchema(),
        log:
          process.env.NODE_ENV === 'development'
            ? ['warn', 'error']
            : ['warn', 'error'],
      })
      this.pool = created.pool
      this.client = created.client

      // Bridge with existing backend-core getDbClient() usage
      setDbClient(this.client)
    }
    return this.client
  }

  async connect(): Promise<void> {
    const client = this.getClient()
    await client.$connect()
    if (this.pool) await verifyDbSchema(this.pool, this.configuredSchema())
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

  private configuredSchema(): string | undefined {
    return 'url' in this.config ? undefined : this.config.schema
  }
}
