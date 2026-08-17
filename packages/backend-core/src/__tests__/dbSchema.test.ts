/**
 * Unit tests for schema-per-branch DB isolation (#44).
 * Tests the logic that maps DB_SCHEMA env → pg pool options.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildPgSchemaOptions,
  resolveDbSchema,
  verifyDbSchema,
} from '../db/client'

const original = process.env.DB_SCHEMA

beforeEach(() => {
  // The helper reads the env directly, so each case states its own world.
  delete process.env.DB_SCHEMA
})

afterEach(() => {
  if (original === undefined) delete process.env.DB_SCHEMA
  else process.env.DB_SCHEMA = original
})

describe('DB_SCHEMA schema-per-branch isolation (#44)', () => {
  it('returns empty object when DB_SCHEMA is unset (public schema implicit)', () => {
    expect(buildPgSchemaOptions(undefined)).toEqual({})
  })

  it('returns empty object when DB_SCHEMA is empty string', () => {
    expect(buildPgSchemaOptions('')).toEqual({})
  })

  it('sets search_path on the pool when DB_SCHEMA is set', () => {
    expect(buildPgSchemaOptions('preview_feat-my-branch')).toEqual({
      options: '-c search_path=preview_feat-my-branch',
    })
  })

  it('handles schema names with underscores and hyphens', () => {
    const result = buildPgSchemaOptions('preview_feature-123')
    expect(result).toEqual({ options: '-c search_path=preview_feature-123' })
  })

  it('falls back to DB_SCHEMA when no schema is passed', () => {
    // The middleware pool has no schema in its config when it is given a plain
    // url, so the env var is the only thing standing between a preview env and
    // the shared `public` tables.
    process.env.DB_SCHEMA = 'preview_from-env'
    expect(buildPgSchemaOptions()).toEqual({
      options: '-c search_path=preview_from-env',
    })
  })

  it('lets DB_SCHEMA override a schema from the app config', () => {
    // The deployment knows it is a preview; the config server does not, and its
    // baked `public` would otherwise undo the isolation.
    process.env.DB_SCHEMA = 'preview_from-env'
    expect(buildPgSchemaOptions('public')).toEqual({
      options: '-c search_path=preview_from-env',
    })
  })

  it('uses the configured schema when DB_SCHEMA is unset', () => {
    expect(buildPgSchemaOptions('public')).toEqual({
      options: '-c search_path=public',
    })
  })
})

describe('resolveDbSchema', () => {
  it('is undefined when nothing configures a schema', () => {
    expect(resolveDbSchema()).toBeUndefined()
    expect(resolveDbSchema('')).toBeUndefined()
  })

  it('prefers DB_SCHEMA over the configured schema', () => {
    process.env.DB_SCHEMA = 'preview_from-env'
    expect(resolveDbSchema('public')).toBe('preview_from-env')
  })

  it('falls back to the configured schema', () => {
    expect(resolveDbSchema('public')).toBe('public')
  })
})

describe('verifyDbSchema fail-fast (#82)', () => {
  const poolReturning = (schema: string | null) =>
    ({
      query: async () => ({ rows: [{ schema }] }),
    }) as unknown as Parameters<typeof verifyDbSchema>[0]

  it('stays quiet for a deployment with no isolation to verify', async () => {
    await expect(
      verifyDbSchema(poolReturning('public')),
    ).resolves.toBeUndefined()
  })

  it('passes when the database resolves the expected schema', async () => {
    process.env.DB_SCHEMA = 'preview_feat-my-branch'
    await expect(
      verifyDbSchema(poolReturning('preview_feat-my-branch')),
    ).resolves.toBeUndefined()
  })

  it('throws when a missing schema falls the connection through to public', async () => {
    // Postgres skips a search_path entry that does not exist, which would let a
    // preview env quietly read and overwrite the shared catalog.
    process.env.DB_SCHEMA = 'preview_feat-my-branch'
    await expect(verifyDbSchema(poolReturning('public'))).rejects.toThrow(
      /current_schema\(\) to "public"/,
    )
  })
})
