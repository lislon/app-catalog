import type { AppForCatalog } from '@igstack/app-catalog-backend-core'

export function getAppUrl(app: AppForCatalog): string {
  return app.appUrl || '#'
}
