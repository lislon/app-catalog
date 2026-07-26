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

/** First 7 chars of a git SHA, or undefined when absent. */
export function shortSha(sha?: string | null): string | undefined {
  return sha ? sha.slice(0, 7) : undefined
}

/** Build a commit URL from a repo homepage + full/short SHA. */
export function getCommitUrl(
  homepage: string | undefined,
  sha: string | undefined,
): string | undefined {
  if (!homepage || !sha) return undefined
  return `${homepage.replace(/\/$/, '')}/commit/${sha}`
}

/**
 * Reads `version`, `gitHead` (baked at publish time), and `homepage` from an
 * installed package.json under node_modules.
 */
export function getPackageMeta(
  packageName: string = '@igstack/app-catalog-frontend-core',
): { version: string | null; gitHead: string | null; homepage: string | null } {
  try {
    const pkgPath = join(
      process.cwd(),
      'node_modules',
      packageName,
      'package.json',
    )
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return {
      version: pkg.version ?? null,
      gitHead: pkg.gitHead ?? null,
      homepage: pkg.homepage ?? null,
    }
  } catch (error) {
    console.warn(
      `[versionUtils] Failed to read package meta from ${packageName}:`,
      error,
    )
    return { version: null, gitHead: null, homepage: null }
  }
}

/**
 * Gets frontend package version from node_modules
 */
export function getFrontendPackageVersion(
  packageName: string = '@igstack/app-catalog-frontend-core',
): string | null {
  return getPackageMeta(packageName).version
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

  // Frontend version + git SHA from package.json (SHA baked at publish time)
  const feMeta = getPackageMeta(options?.frontendPackageName)
  if (feMeta.version) {
    const sha = shortSha(feMeta.gitHead)
    versions.frontend = {
      displayName: feMeta.version,
      ...(sha && {
        sha,
        shaUrl: getCommitUrl(feMeta.homepage ?? undefined, sha),
      }),
    }
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
