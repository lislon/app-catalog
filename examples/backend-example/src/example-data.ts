/**
 * Example catalog data demonstrating the Resource structure
 */
import type { Resource } from '@igstack/app-catalog-backend-core'

export const exampleResources: Resource[] = [
  {
    id: 'example-app',
    slug: 'example-app',
    displayName: 'Example Application',
    abbreviation: 'ExApp',
    description: 'A sample application demonstrating catalog structure',
    teams: ['engineering'],
    tags: ['example', 'demo'],
    appUrl: 'https://example.com',
  },
]
