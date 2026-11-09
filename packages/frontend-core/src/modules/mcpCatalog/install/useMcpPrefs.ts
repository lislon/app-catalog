import type { InstallOptionId } from '@igstack/app-catalog-shared-core'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'
import { useDb } from '~/userDb/DbContext'

/**
 * The MCP tab's remembered choices, in this browser's IndexedDB: how you
 * install, and which servers you marked installed. Live, so every button and
 * row on screen follows a change made anywhere.
 */
export function useMcpPrefs(): {
  installWith?: InstallOptionId
  setInstallWith: (id: InstallOptionId) => Promise<void>
  installed: Set<string>
  toggleInstalled: (slug: string) => Promise<void>
} {
  const db = useDb()
  const rows = useLiveQuery(() => db.mcpPrefs.toArray(), [db])

  const installWith = rows?.find((r) => r.key === 'installWith')?.value
  const installedList = rows?.find((r) => r.key === 'installed')?.value
  const installed = useMemo(() => new Set(installedList), [installedList])

  const setInstallWith = useCallback(
    async (id: InstallOptionId) => {
      await db.mcpPrefs.put({ key: 'installWith', value: id })
    },
    [db],
  )

  const toggleInstalled = useCallback(
    (slug: string) =>
      db.transaction('rw', db.mcpPrefs, async () => {
        const row = await db.mcpPrefs.get('installed')
        const list = row?.key === 'installed' ? row.value : []
        await db.mcpPrefs.put({
          key: 'installed',
          value: list.includes(slug)
            ? list.filter((s) => s !== slug)
            : [...list, slug],
        })
      }),
    [db],
  )

  return { installWith, setInstallWith, installed, toggleInstalled }
}
