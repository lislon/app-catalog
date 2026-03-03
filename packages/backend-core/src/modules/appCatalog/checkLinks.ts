import type { AppForCatalog } from '../../types/common/appCatalogTypes'
import { getDbClient } from '../../db/client'

interface LinkCheck {
  url: string
  status: number | null
  error?: string
  appSlug: string
  linkType: 'appUrl' | 'sources' | 'accessRequest.urls'
}

interface CheckLinksOptions {
  maxConcurrent?: number
  timeout?: number
  maxRetries?: number
  onProgress?: (result: LinkCheck) => void
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function checkUrlWithRetry(
  url: string,
  options: {
    timeout: number
    maxRetries: number
  },
): Promise<{ status: number | null; error?: string }> {
  let lastError: string | undefined

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual', // Don't follow redirects
        signal: AbortSignal.timeout(options.timeout),
      })
      return { status: response.status }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      lastError = errorMessage

      // Check if it's a retryable error (timeout or fetch failed)
      const isRetryable =
        errorMessage.includes('aborted') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch failed')

      if (isRetryable && attempt < options.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = 1000 * 2 ** attempt
        await sleep(backoffMs)
        continue
      }

      break
    }
  }

  return { status: null, error: lastError }
}

function getStatusEmoji(status: number | null): string {
  if (status === null) return '❌'
  if (status >= 200 && status < 300) return '✅'
  if (status >= 300 && status < 400) return '🔀'
  if (status === 403) return '🔒' // 403 is not an error, just forbidden
  if (status && status >= 400 && status < 500) return '⚠️'
  return '❌'
}

function isWorkingLink(status: number | null): boolean {
  if (status === null) return false
  // 2xx, 3xx, and 403 are considered working
  if (status >= 200 && status < 400) return true
  if (status === 403) return true
  return false
}

function isBrokenLink(status: number | null): boolean {
  if (status === null) return true
  // 403 is not broken
  if (status === 403) return false
  // 4xx (except 403) and 5xx are broken
  return status >= 400
}

function formatStatus(status: number | null, error?: string): string {
  if (status === null) {
    return `ERROR: ${error || 'Unknown error'}`
  }
  return `${status}`
}

async function getAppsFromDb(): Promise<Array<AppForCatalog>> {
  const prisma = getDbClient()
  const rows = await prisma.dbAppForCatalog.findMany()

  return rows.map((row) => {
    const accessRequest =
      row.accessRequest as unknown as AppForCatalog['accessRequest']
    const teams = (row.teams as unknown as Array<string> | null) ?? []
    const tags = (row.tags as unknown as AppForCatalog['tags']) ?? []
    const screenshotIds =
      (row.screenshotIds as unknown as AppForCatalog['screenshotIds']) ?? []
    const sources = (row.sources as unknown as Array<string> | null) ?? []
    const notes = row.notes == null ? undefined : row.notes
    const appUrl = row.appUrl == null ? undefined : row.appUrl
    const iconName = row.iconName == null ? undefined : row.iconName
    const deprecated =
      row.deprecated == null
        ? undefined
        : (row.deprecated as unknown as AppForCatalog['deprecated'])

    return {
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      description: row.description,
      accessRequest,
      teams,
      notes,
      tags,
      appUrl,
      iconName,
      screenshotIds,
      sources,
      deprecated,
    }
  })
}

/**
 * Check all links in the app catalog and return a report
 */
export async function checkAllLinks(options: CheckLinksOptions = {}): Promise<{
  total: number
  working: number
  broken: number
  redirects: number
  checks: Array<LinkCheck>
}> {
  const {
    maxConcurrent = 10,
    timeout = 60000,
    maxRetries = 3,
    onProgress,
  } = options

  const apps = await getAppsFromDb()
  const checks: Array<Omit<LinkCheck, 'status' | 'error'>> = []

  // Collect all links
  for (const app of apps) {
    // Check appUrl
    if (app.appUrl) {
      checks.push({
        url: app.appUrl,
        appSlug: app.slug,
        linkType: 'appUrl',
      })
    }

    // Check sources
    if (app.sources && app.sources.length > 0) {
      for (const source of app.sources) {
        checks.push({
          url: source,
          appSlug: app.slug,
          linkType: 'sources',
        })
      }
    }

    // Check accessRequest.urls
    if (app.accessRequest?.urls && app.accessRequest.urls.length > 0) {
      for (const link of app.accessRequest.urls) {
        checks.push({
          url: link.url,
          appSlug: app.slug,
          linkType: 'accessRequest.urls',
        })
      }
    }
  }

  // Check all links with concurrency control
  const results: Array<LinkCheck> = []
  const queue = [...checks]
  const inProgress = new Set<Promise<void>>()

  while (queue.length > 0 || inProgress.size > 0) {
    // Start new requests up to maxConcurrent
    while (queue.length > 0 && inProgress.size < maxConcurrent) {
      const check = queue.shift()!

      const promise = (async () => {
        const result = await checkUrlWithRetry(check.url, {
          timeout,
          maxRetries,
        })

        const linkCheck: LinkCheck = {
          ...check,
          status: result.status,
          error: result.error,
        }
        results.push(linkCheck)

        // Stream result if callback provided
        if (onProgress) {
          onProgress(linkCheck)
        }
      })()

      inProgress.add(promise)

      // Clean up when promise completes
      void promise.finally(() => {
        inProgress.delete(promise)
      })
    }

    // Wait for at least one to complete before continuing
    if (inProgress.size > 0) {
      await Promise.race(inProgress)
    }
  }

  const working = results.filter((r) => isWorkingLink(r.status))
  const broken = results.filter((r) => isBrokenLink(r.status))
  const redirects = results.filter(
    (r) => r.status && r.status >= 300 && r.status < 400,
  )

  return {
    total: results.length,
    working: working.length,
    broken: broken.length,
    redirects: redirects.length,
    checks: results,
  }
}

/**
 * Print a formatted report of link check results
 */
export function printLinkCheckReport(report: {
  total: number
  working: number
  broken: number
  redirects: number
  checks: Array<LinkCheck>
}): void {
  console.log('📊 Results:\n')
  console.log(`✅ Working links: ${report.working}`)
  console.log(`❌ Broken links: ${report.broken}`)
  console.log(`🔀 Redirects: ${report.redirects}`)
  console.log()

  const broken = report.checks.filter((r) => isBrokenLink(r.status))
  const redirects = report.checks.filter(
    (r) => r.status && r.status >= 300 && r.status < 400,
  )

  // Show broken links
  if (broken.length > 0) {
    console.log('❌ Broken Links:\n')
    for (const link of broken) {
      console.log(
        `  ${getStatusEmoji(link.status)} [${link.appSlug}] ${link.linkType}`,
      )
      console.log(`     ${link.url}`)
      console.log(`     Status: ${formatStatus(link.status, link.error)}`)
      console.log()
    }
  }

  // Show redirects
  if (redirects.length > 0) {
    console.log('🔀 Redirects:\n')
    for (const link of redirects) {
      console.log(
        `  ${getStatusEmoji(link.status)} [${link.appSlug}] ${link.linkType}`,
      )
      console.log(`     ${link.url}`)
      console.log(`     Status: ${formatStatus(link.status, link.error)}`)
      console.log()
    }
  }

  // Summary by app
  const appStats = new Map<
    string,
    { working: number; broken: number; total: number }
  >()
  for (const result of report.checks) {
    const stats = appStats.get(result.appSlug) || {
      working: 0,
      broken: 0,
      total: 0,
    }
    stats.total++
    if (isWorkingLink(result.status)) {
      stats.working++
    } else {
      stats.broken++
    }
    appStats.set(result.appSlug, stats)
  }

  const appsWithBrokenLinks = Array.from(appStats.entries())
    .filter(([_, stats]) => stats.broken > 0)
    .sort((a, b) => b[1].broken - a[1].broken)

  if (appsWithBrokenLinks.length > 0) {
    console.log('📱 Apps with broken links:\n')
    for (const [appSlug, stats] of appsWithBrokenLinks) {
      console.log(`  ${appSlug}: ${stats.broken}/${stats.total} broken`)
    }
    console.log()
  }

  if (broken.length > 0) {
    console.log(`\n❌ Found ${broken.length} broken link(s)`)
  } else {
    console.log('\n✅ All links are working!')
  }
}
