/**
 * Throwaway Postgres schema for DB-backed tests. Requires AC_TEST_DATABASE_URL;
 * callers wrap their suite in `describe.skipIf(!TEST_DB_URL)`.
 *
 * Call `useTestDatabase(prefix)` inside the describe: it creates a fresh schema,
 * pushes the Prisma schema into it, points `getDbClient()` at it, and drops it
 * (CASCADE) afterwards. Read `.prisma` inside tests, not at describe time.
 */
import { afterAll, beforeAll, vi } from 'vitest'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '../../generated/prisma/client'
import * as dbClient from '../../db/client'

const BACKEND_CORE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

export const TEST_DB_URL = process.env.AC_TEST_DATABASE_URL

if (process.env.CI && !TEST_DB_URL) {
  throw new Error(
    'AC_TEST_DATABASE_URL is required in CI: DB-backed suites would otherwise skip silently',
  )
}

export function useTestDatabase(prefix: string): {
  prisma: PrismaClient
  schema: string
} {
  const handle = {} as { prisma: PrismaClient; schema: string }
  let testSchema: string | undefined

  beforeAll(async () => {
    if (!TEST_DB_URL) return
    testSchema = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    handle.schema = testSchema

    execSync(`psql "${TEST_DB_URL}" -c "CREATE SCHEMA \\"${testSchema}\\""`, {
      stdio: 'inherit',
    })
    execSync(
      `pnpm exec prisma db push --accept-data-loss --url="${TEST_DB_URL}?schema=${testSchema}"`,
      { cwd: BACKEND_CORE_ROOT, stdio: 'inherit' },
    )

    handle.prisma = dbClient.createCorePrismaClient({
      connectionString: TEST_DB_URL,
      configuredSchema: testSchema,
    }).client
    await handle.prisma.$connect()
    vi.spyOn(dbClient, 'getDbClient').mockReturnValue(handle.prisma)
  })

  afterAll(async () => {
    if (!TEST_DB_URL || !testSchema) return
    await handle.prisma.$disconnect()
    try {
      execSync(
        `psql "${TEST_DB_URL}" -c "DROP SCHEMA IF EXISTS \\"${testSchema}\\" CASCADE"`,
        { stdio: 'inherit' },
      )
    } catch (e) {
      console.error('Failed to drop test schema:', e)
    }
    vi.restoreAllMocks()
  })

  return handle
}
