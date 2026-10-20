import { describe, expect, it } from 'vitest'
import { exampleResources } from '../example-data.js'

describe('Example Resources', () => {
  it('should have valid structure', () => {
    expect(exampleResources).toHaveLength(1)
    expect(exampleResources[0]).toHaveProperty('id')
    expect(exampleResources[0]).toHaveProperty('slug')
    expect(exampleResources[0]).toHaveProperty('displayName')
  })
})
