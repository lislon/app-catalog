import type { AppVersionInfo } from '@igstack/app-catalog-backend-core'

/**
 * Merge the (company-agnostic) frontend build id into the backend-provided
 * version info's `frontend` slot.
 *
 * The build id is baked into the deployed JS bundle at build time (e.g. a CI
 * pipeline id via a Vite env var). We PREPEND it to the resolved frontend-core
 * npm version instead of replacing it, so the footer surfaces both:
 *   `#<buildId> · <frontend-core version> (<sha>)`.
 *
 * - No build id → return versions unchanged.
 * - build id === 'local' → show `local` (local dev, no meaningful SHA/version).
 * - otherwise → prepend `#<buildId> · ` and preserve the version + sha + shaUrl.
 */
export function mergeFrontendBuildId(
  versions: AppVersionInfo,
  frontendBuildId: string | undefined,
): AppVersionInfo {
  if (!frontendBuildId) return versions
  if (frontendBuildId === 'local') {
    return { ...versions, frontend: { displayName: 'local' } }
  }
  const be = versions.frontend
  return {
    ...versions,
    frontend: be
      ? { ...be, displayName: `#${frontendBuildId} · ${be.displayName}` }
      : { displayName: `#${frontendBuildId}` },
  }
}
