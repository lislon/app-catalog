import type { AppForCatalog } from '../../types/common/appCatalogTypes'
import { getDbClient } from '../../db/client'

interface LinkCheck {
  url: string
  status: number | null
  error?: string
  appSlug: string
  linkType: 'appUrl' | 'sources' | 'accessRequest.urls'
}

async function checkUrl(
  url: string,
): Promise<{ status: number | null; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })
    return { status: response.status }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { status: null, error: error.message }
    }
    return { status: null, error: String(error) }
  }
}

function getStatusEmoji(status: number | null): string {
  if (status === null) return '❌'
  if (status >= 200 && status < 300) return '✅'
  if (status >= 300 && status < 400) return '🔀'
  if (status >= 400 && status < 500) return '⚠️'
  return '❌'
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
export async function checkAllLinks(): Promise<{
  total: number
  working: number
  broken: number
  redirects: number
  checks: Array<LinkCheck>
}> {
  const apps = await getAppsFromDb()
  const checks: Array<LinkCheck> = []

  // Collect all links
  for (const app of apps) {
    // Check appUrl
    if (app.appUrl) {
      checks.push({
        url: app.appUrl,
        status: null,
        appSlug: app.slug,
        linkType: 'appUrl',
      })
    }

    // Check sources
    if (app.sources && app.sources.length > 0) {
      for (const source of app.sources) {
        checks.push({
          url: source,
          status: null,
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
          status: null,
          appSlug: app.slug,
          linkType: 'accessRequest.urls',
        })
      }
    }
  }

  // Check all links
  const results: Array<LinkCheck> = []

  for (const check of checks) {
    const result = await checkUrl(check.url)

    const linkCheck: LinkCheck = {
      ...check,
      status: result.status,
      error: result.error,
    }
    results.push(linkCheck)
  }

  const working = results.filter(
    (r) => r.status && r.status >= 200 && r.status < 300,
  )
  const broken = results.filter((r) => r.status === null || r.status >= 400)
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

  const broken = report.checks.filter(
    (r) => r.status === null || r.status >= 400,
  )
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
    if (result.status && result.status >= 200 && result.status < 300) {
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
