import { useCallback, useState } from 'react'
import type { AppClickHistoryItem } from '~/userDb/AcDb'
import { useDb } from '~/userDb/DbContext'

const MAX_HISTORY_ITEMS = 1000

/**
 * Hook for tracking app click history and retrieving top clicked apps.
 *
 * Features:
 * - Deduplicates consecutive clicks on the same app
 * - Auto-trims history to MAX_HISTORY_ITEMS
 * - Provides top N most clicked apps by count (not recency)
 */
export function useAppClickHistory() {
  const db = useDb()
  const [lastClickedSlug, setLastClickedSlug] = useState<string | undefined>()

  // Trim history if it exceeds MAX_HISTORY_ITEMS
  const trimHistory = useCallback(async () => {
    const count = await db.appClickHistory.count()
    if (count > MAX_HISTORY_ITEMS) {
      const itemsToDelete = count - MAX_HISTORY_ITEMS
      const oldestItems = await db.appClickHistory
        .toCollection()
        .sortBy('timestamp')
      const idsToDelete = oldestItems
        .slice(0, itemsToDelete)
        .map((item) => item.id)
        .filter((id): id is number => id !== undefined)
      await db.appClickHistory.bulkDelete(idsToDelete)
    }
  }, [db.appClickHistory])

  /**
   * Record a click on an app.
   * Deduplicates consecutive clicks on the same app.
   *
   * @param appSlug - The slug of the clicked app
   */
  const recordClick = useCallback(
    async (appSlug: string) => {
      // Deduplicate consecutive clicks
      if (lastClickedSlug === appSlug) {
        return
      }

      const timestamp = Date.now()
      const historyItem: AppClickHistoryItem = {
        appSlug,
        timestamp,
      }

      await db.appClickHistory.add(historyItem)
      setLastClickedSlug(appSlug)

      // Trim if needed (async, don't await)
      void trimHistory()
    },
    [db.appClickHistory, lastClickedSlug, trimHistory],
  )

  /**
   * Get the top N most clicked app slugs by click count.
   *
   * @param limit - Number of top apps to return (default: 10)
   * @returns Array of app slugs sorted by click count (descending)
   */
  const getTopApps = useCallback(
    async (limit: number = 10): Promise<Array<string>> => {
      const allHistory = await db.appClickHistory.toArray()

      // Count clicks per app
      const clickCounts = new Map<string, number>()
      allHistory.forEach((item) => {
        const count = clickCounts.get(item.appSlug) || 0
        clickCounts.set(item.appSlug, count + 1)
      })

      // Sort by count descending and take top N
      return Array.from(clickCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([slug]) => slug)
    },
    [db.appClickHistory],
  )

  return {
    recordClick,
    getTopApps,
  }
}
