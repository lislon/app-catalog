import { describe, expect, it } from 'vitest'
import {
  decodeFiltersParam,
  encodeFiltersParam,
} from '~/modules/appCatalog/utils/filterHelpers'

describe('filterHelpers', () => {
  it('encodes multiple filters to URL param format', () => {
    expect(
      encodeFiltersParam({
        category: 'communication',
        department: 'sales',
        technology: 'react',
      }),
    ).toBe('category:communication,department:sales,technology:react')
  })

  it('decodes multiple filters from URL param format', () => {
    expect(
      decodeFiltersParam(
        'category:communication,department:sales,technology:react',
      ),
    ).toEqual({
      category: 'communication',
      department: 'sales',
      technology: 'react',
    })
  })
})
