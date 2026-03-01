import type { AppCatalogCompanySpecificBackend } from '../types/backend/companySpecificBackend'
import type { EhBackendProvider } from './types'

/**
 * Type guard to check if an object implements AppCatalogCompanySpecificBackend.
 */
function isBackendInstance(
  obj: unknown,
): obj is AppCatalogCompanySpecificBackend {
  return typeof obj === 'object' && obj !== null
}

/**
 * Normalizes different backend provider types into a consistent async factory function.
 * Supports:
 * - Direct object implementing AppCatalogCompanySpecificBackend
 * - Sync factory function that returns the backend
 * - Async factory function that returns the backend
 */
export function createBackendResolver(
  provider: EhBackendProvider,
): () => Promise<AppCatalogCompanySpecificBackend> {
  // If it's already an object with the required methods, wrap it
  if (isBackendInstance(provider)) {
    return async () => provider
  }

  // If it's a function, call it and handle both sync and async results
  if (typeof provider === 'function') {
    return async () => {
      const result = (
        provider as () =>
          | AppCatalogCompanySpecificBackend
          | Promise<AppCatalogCompanySpecificBackend>
      )()
      return result instanceof Promise ? await result : result
    }
  }

  throw new Error(
    'Invalid backend provider: must be an object implementing AppCatalogCompanySpecificBackend or a factory function',
  )
}
