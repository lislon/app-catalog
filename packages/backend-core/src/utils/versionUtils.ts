import type { AppVersionInfo } from '../types/common/appCatalogTypes.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Gets backend pipeline ID from environment variable
 * Use BUILD_PIPELINE_ID env var, otherwise 'local'
 */
export function getBuildPipelineId(): string {
  return process.env.BUILD_PIPELINE_ID || 'local'
}

/**
 * Gets backend pipeline URL from environment variable
 * Use BUILD_PIPELINE_URL env var if available
 */
export function getBuildPipelineUrl(): string | undefined {
  return process.env.BUILD_PIPELINE_URL
}

/**
 * Gets frontend package version from node_modules
 */
export function getFrontendPackageVersion(
  packageName: string = '@igstack/app-catalog-frontend-core',
): string | null {
  try {
    const pkgPath = join(
      process.cwd(),
      'node_modules',
      packageName,
      'package.json',
    )
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version || null
  } catch (error) {
    console.warn(
      `[versionUtils] Failed to read frontend version from ${packageName}:`,
      error,
    )
    return null
  }
}

/**
 * Complete helper to get both backend and frontend versions
 * Backend: reads BUILD_PIPELINE_ID and BUILD_PIPELINE_URL from environment
 * Frontend: reads version from package.json
 * Logs version info to help debug CI/CD issues
 */
export function getVersionInfo(options?: {
  frontendPackageName?: string
  silent?: boolean
}): AppVersionInfo {
  const versions: AppVersionInfo = {}

  // Backend version from environment
  const pipelineId = getBuildPipelineId()
  const pipelineUrl = getBuildPipelineUrl()

  versions.backend = {
    displayName: pipelineId,
    ...(pipelineUrl && { url: pipelineUrl }),
  }

  // Frontend version from package.json
  const frontendVersion = getFrontendPackageVersion(
    options?.frontendPackageName,
  )
  if (frontendVersion) {
    versions.frontend = { displayName: frontendVersion }
  }

  // Log for debugging CI/CD
  if (!options?.silent) {
    console.log('=================================')
    console.log('[Version Info]')
    console.log(`  Backend:  ${versions.backend.displayName}`)
    if (versions.backend.url) {
      console.log(`  URL:      ${versions.backend.url}`)
    }
    if (versions.frontend) {
      console.log(`  Frontend: ${versions.frontend.displayName}`)
    }
    console.log('  Environment:')
    console.log(
      `    BUILD_PIPELINE_ID:  ${process.env.BUILD_PIPELINE_ID || '(not set)'}`,
    )
    console.log(
      `    BUILD_PIPELINE_URL: ${process.env.BUILD_PIPELINE_URL || '(not set)'}`,
    )
    console.log('=================================')
  }

  return versions
}
