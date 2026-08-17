/**
 * Regression tests for preview-env schema isolation (#82).
 *
 * A `search_path` on the pool is not enough: Prisma 7 driver adapters qualify
 * every table name with the schema the adapter reports, so a preview env whose
 * adapter reports nothing reads and writes `public` no matter what the pool's
 * `current_schema()` says. These tests pin the schema all the way to the
 * `PrismaPg` constructor for every core call site.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const poolCtor = vi.fn()
const adapterCtor = vi.fn()

vi.mock('pg', () => ({
  default: {
    Pool: class {
      constructor(config: unknown) {
        poolCtor(config)
      }
    },
  },
}))

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(pool: unknown, options: unknown) {
      adapterCtor(pool, options)
    }
  },
}))

vi.mock('../generated/prisma/client', () => ({
  PrismaClient: class {
    $connect = vi.fn()
    $disconnect = vi.fn()
  },
}))

const original = process.env.DB_SCHEMA

beforeEach(() => {
  vi.resetModules()
  poolCtor.mockClear()
  adapterCtor.mockClear()
  process.env.DB_SCHEMA = 'preview_feat-my-branch'
})

afterEach(() => {
  if (original === undefined) delete process.env.DB_SCHEMA
  else process.env.DB_SCHEMA = original
})

const adapterSchema = () => adapterCtor.mock.calls[0]?.[1]
const poolOptions = () =>
  (poolCtor.mock.calls[0]?.[0] as { options?: string } | undefined)?.options

describe('preview-env schema reaches the Prisma adapter (#82)', () => {
  it('getDbClient() passes DB_SCHEMA to the adapter, not just the pool', async () => {
    process.env.AC_CORE_DATABASE_URL = 'postgresql://u:p@h:5432/db'
    const { getDbClient } = await import('../db/client')

    getDbClient()

    expect(poolOptions()).toBe('-c search_path=preview_feat-my-branch')
    expect(adapterSchema()).toEqual({ schema: 'preview_feat-my-branch' })
  })

  it('the middleware pool - the one the app uses - carries the schema too', async () => {
    const { AcDatabaseManager } = await import('../middleware/database')

    new AcDatabaseManager({
      host: 'h',
      port: 5432,
      database: 'db',
      username: 'u',
      password: 'p',
      schema: 'public',
    }).getClient()

    expect(poolOptions()).toBe('-c search_path=preview_feat-my-branch')
    expect(adapterSchema()).toEqual({ schema: 'preview_feat-my-branch' })
  })

  it('the AI tools client reads the preview schema, not the shared catalog', async () => {
    const { createAppCatalogAITools } =
      await import('../modules/lighthouseKeeper/tools')

    createAppCatalogAITools({
      host: 'h',
      port: 5432,
      database: 'db',
      username: 'u',
      password: 'p',
      schema: 'public',
    })

    expect(poolOptions()).toBe('-c search_path=preview_feat-my-branch')
    expect(adapterSchema()).toEqual({ schema: 'preview_feat-my-branch' })
  })

  it('leaves the adapter schema unset when DB_SCHEMA is not configured', async () => {
    delete process.env.DB_SCHEMA
    process.env.AC_CORE_DATABASE_URL = 'postgresql://u:p@h:5432/db'
    const { getDbClient } = await import('../db/client')

    getDbClient()

    expect(poolOptions()).toBeUndefined()
    expect(adapterSchema()).toEqual({ schema: undefined })
  })
})
