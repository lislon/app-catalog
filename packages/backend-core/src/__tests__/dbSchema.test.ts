/**
 * Unit tests for schema-per-branch DB isolation (#44).
 * Tests the logic that maps DB_SCHEMA env → pg pool options.
 */
import { describe, expect, it } from 'vitest'

/** Mirrors the pool-config logic from db/client.ts */
function buildPoolSchemaOptions(
  dbSchema: string | undefined,
): { options: string } | Record<string, never> {
  return dbSchema ? { options: `-c search_path=${dbSchema}` } : {}
}

describe('DB_SCHEMA schema-per-branch isolation (#44)', () => {
  it('returns empty object when DB_SCHEMA is unset (public schema implicit)', () => {
    expect(buildPoolSchemaOptions(undefined)).toEqual({})
  })

  it('returns empty object when DB_SCHEMA is empty string', () => {
    expect(buildPoolSchemaOptions('')).toEqual({})
  })

  it('sets search_path on the pool when DB_SCHEMA is set', () => {
    expect(buildPoolSchemaOptions('preview_feat-my-branch')).toEqual({
      options: '-c search_path=preview_feat-my-branch',
    })
  })

  it('handles schema names with underscores and hyphens', () => {
    const result = buildPoolSchemaOptions('preview_feature-123')
    expect(result).toEqual({ options: '-c search_path=preview_feature-123' })
  })
})
