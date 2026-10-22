import {
  isCaptureAllowed,
  nextLifecycle,
} from '@igstack/app-catalog-shared-core'
import { getDbClient } from '../../db/client'
import { resizeImage } from '../assets/assetUtils'
import { upsertAsset } from '../assets/upsertAsset'
import type { CaptureResult, ScreenshotCapturer } from './capture'

export interface CaptureDeps {
  captureHosts: string[]
  capturer: ScreenshotCapturer | null
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
/** Wall time one run may spend; what is left is due again on the next tick. */
const RUN_BUDGET_MS = 40 * MINUTE_MS
/** Past the budget plus one capture, and short of the next tick. */
const RUN_TRANSACTION_TIMEOUT_MS = 55 * MINUTE_MS
const FIRST_RUN_DELAY_MS = MINUTE_MS

interface CheckableTool {
  id: string
  slug: string
  url: string
  failingSince: Date | null
  archivedAt: Date | null
  archivedBy: string | null
}

/** Stores the screenshot and, when it decodes, the favicon as assets. */
async function storeCapture(
  slug: string,
  result: Extract<CaptureResult, { ok: true }>,
  now: Date,
) {
  const prisma = getDbClient()
  const screenshotAssetId = await upsertAsset({
    prisma,
    buffer: result.png,
    name: `community-${slug}-screenshot`,
    originalFilename: `community-${slug}-screenshot.png`,
    assetType: 'screenshot',
  })

  let faviconAssetId: string | undefined
  if (result.favicon) {
    try {
      // ponytail: sharp cannot decode .ico, so those tools get no favicon; add an ico decoder if it matters
      const png = await resizeImage(result.favicon, 64, 64, 'png')
      faviconAssetId = await upsertAsset({
        prisma,
        buffer: png,
        name: `community-${slug}-icon`,
        originalFilename: `community-${slug}-icon.png`,
        assetType: 'icon',
      })
    } catch {
      // An undecodable favicon leaves the previous one, or none.
    }
  }

  return {
    screenshotAssetId,
    ...(faviconAssetId && { faviconAssetId }),
    capturedAt: now,
  }
}

/**
 * Visits one tool and records the result. Hosts outside the configured suffixes, and a
 * deployment without a capturer, are left untouched: no check means no state change.
 */
export async function checkTool(
  tool: CheckableTool,
  deps: CaptureDeps,
  now: Date,
): Promise<void> {
  if (!deps.capturer || !isCaptureAllowed(tool.url, deps.captureHosts)) return

  let result: CaptureResult
  try {
    result = await deps.capturer.capture(tool.url, deps.captureHosts)
  } catch (error) {
    // A browser that would not start says nothing about the page, so the
    // lifecycle stays as it was. The attempt is still recorded: without it a
    // new tool reads "capture pending" forever and its open card keeps asking.
    await getDbClient().dbCommunityTool.update({
      where: { id: tool.id },
      data: { lastCheckAt: now },
    })
    throw error
  }
  await getDbClient().dbCommunityTool.update({
    where: { id: tool.id },
    data: {
      lastCheckAt: now,
      ...nextLifecycle(tool, result.ok, now),
      ...(result.ok && (await storeCapture(tool.slug, result, now))),
    },
  })
}

/**
 * One pass over every tool not checked in the last day.
 *
 * The transaction-scoped lock rather than `pg_try_advisory_lock`: a session lock is
 * held by whichever pooled connection ran the query, and the unlock may run on another,
 * leaving the lock stuck forever. The transaction pins one connection and releases the
 * lock when it ends, even if the pod dies mid-run.
 *
 * ponytail: one transaction holds the lock for the whole run, so a run is capped at
 * RUN_BUDGET_MS (about 90 tools at 25 s each); per-tool short transactions or a job
 * queue if the catalog outgrows that.
 */
export async function runHealthCheckOnce(
  deps: CaptureDeps,
  now: Date,
  clock: () => number = Date.now,
): Promise<void> {
  const db = getDbClient()
  await db.$transaction(
    async (tx) => {
      const [row] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtext('community-tools-health')) AS locked`
      if (!row?.locked) return

      const cutoff = now.getTime() - DAY_MS
      // ponytail: reads every tool each hour; move the filters into the query if the table grows large
      const tools = await db.dbCommunityTool.findMany({
        select: {
          id: true,
          slug: true,
          url: true,
          lastCheckAt: true,
          failingSince: true,
          archivedAt: true,
          archivedBy: true,
        },
      })
      const due = tools.filter(
        (t) =>
          !(t.archivedAt && t.archivedBy !== 'auto') &&
          (!t.lastCheckAt || t.lastCheckAt.getTime() < cutoff),
      )

      const startedAt = clock()
      for (const tool of due) {
        if (clock() - startedAt >= RUN_BUDGET_MS) break
        try {
          await checkTool(tool, deps, now)
        } catch (error) {
          console.error(`[communityTools] health check of ${tool.slug}:`, error)
        }
      }
    },
    { maxWait: 10_000, timeout: RUN_TRANSACTION_TIMEOUT_MS },
  )
}

/**
 * Starts the pass a minute after boot, then hourly: a pod restarted more often than
 * hourly would otherwise never check. The lock keeps pods from overlapping.
 * Returns a stop function.
 */
export function startHealthJob(
  deps: CaptureDeps,
  now: () => Date = () => new Date(),
): () => void {
  const run = () => {
    runHealthCheckOnce(deps, now()).catch((error: unknown) => {
      console.error('[communityTools] health run failed:', error)
    })
  }
  const first = setTimeout(run, FIRST_RUN_DELAY_MS)
  const timer = setInterval(run, HOUR_MS)
  // Neither keeps the process, or a test runner, alive.
  first.unref()
  timer.unref()
  return () => {
    clearTimeout(first)
    clearInterval(timer)
  }
}
