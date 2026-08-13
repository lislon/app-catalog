/**
 * Unit tests for schema-per-branch DB isolation (#44).
 * Tests the logic that maps DB_SCHEMA env → pg pool options.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { buildPgSchemaOptions } from '../db/client'

const original = process.env.DB_SCHEMA

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

  it('prefers an explicitly configured schema over the env var', () => {
    process.env.DB_SCHEMA = 'preview_from-env'
    expect(buildPgSchemaOptions('configured')).toEqual({
      options: '-c search_path=configured',
    })
  })
})
