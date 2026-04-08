import type { Resource } from '@igstack/app-catalog-backend-core'

export function getAppUrl(app: Resource): string {
  return app.appUrl || '#'
}
