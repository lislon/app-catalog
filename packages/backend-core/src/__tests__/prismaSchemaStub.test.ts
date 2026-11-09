import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../prisma/schema.prisma',
  ),
  'utf8',
)

describe('prisma schema', () => {
  it('keeps the inert SourceReference model so `db push` never drops a non-empty table', () => {
    // Deployments migrate with a plain `prisma db push`; removing a model whose
    // table has rows makes it exit 1 and apply nothing.
    const model = /model SourceReference \{([^}]*)\}/.exec(schema)?.[1]
    expect(model).toBeDefined()
    expect(model).not.toContain('@relation')
  })
})
