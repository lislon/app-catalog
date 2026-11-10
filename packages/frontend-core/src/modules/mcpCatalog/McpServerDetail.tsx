import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { Check, Eye, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '~/lib/utils'
import { Button } from '~/ui/button'
import { Skeleton } from '~/ui/skeleton'
import { useAppCatalogContext } from '../appCatalog/context/AppCatalogContext'
import { DetailDialogShell } from '../appCatalog/ui/catalog/DetailDialogShell'
import { CartButton } from './cart/McpCart'
import { InstallButton } from './install/InstallButton'
import { useMcpPrefs } from './install/useMcpPrefs'
import { WhatHappensDialog } from './install/WhatHappensDialog'
import { McpAccessLine } from './McpAccessLine'
import { McpInfoTiles } from './McpInfoTiles'
import { McpSafetyLines } from './McpSafetyLines'
import { McpToolsTable } from './McpToolsTable'
import { STATUS_CHIP } from './signIn'
import { Triad } from './Triad'

/**
 * One server's detail dialog, over the list. The shell owns Escape (through
 * the dismiss stack) and hands focus back to whatever opened it.
 */
export function McpServerDetail({
  slug,
  onClose,
}: {
  slug: string
  onClose: () => void
}) {
  const { mcpServers, isLoadingApps } = useAppCatalogContext()
  const server = mcpServers?.find((s) => s.slug === slug)

  return (
    <DetailDialogShell
      label={server?.displayName ?? 'MCP server'}
      // A cold deep link opens on the skeleton; the arrived server is a new
      // open, so the shell centres the card for its real height.
      shownKey={server ? slug : `${slug}:pending`}
      maxWidthClass="max-w-[min(720px,94vw)]"
      testId="mcp-detail"
      onClose={onClose}
    >
      {server ? (
        <McpServerBody server={server} />
      ) : isLoadingApps ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-12 w-2/3 rounded-xl" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No MCP server is listed at this address.
        </p>
      )}
    </DetailDialogShell>
  )
}

function McpServerBody({ server }: { server: CatalogMcpServer }) {
  const status = STATUS_CHIP[server.status]
  const [whatOpen, setWhatOpen] = useState(false)
  const { installed, toggleInstalled } = useMcpPrefs()
  const isInstalled = installed.has(server.slug)
  const servers = useMemo(() => [server], [server])
  return (
    <>
      <div className="flex items-start gap-3.5 pr-20">
        <Triad server={server} size={48} />
        <div className="min-w-0">
          <div className="mt-0.5 mb-1 flex flex-wrap items-center gap-2">
            <h2 className="m-0 font-serif text-xl font-semibold">
              {server.displayName}
            </h2>
            {status && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] leading-none font-bold',
                  status.className,
                )}
              >
                {status.label}
              </span>
            )}
          </div>
          <p className="mt-2.5 mb-1.5 max-w-[58ch] text-[16.5px] leading-[1.6] font-medium text-foreground">
            {server.description}
          </p>
        </div>
      </div>

      <div
        data-testid="mcp-act-row"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <InstallButton servers={servers} />
        <span className="text-[12.5px] font-semibold text-muted-foreground">
          or
        </span>
        <CartButton server={server} />
        <Button size="sm" variant="ghost" onClick={() => setWhatOpen(true)}>
          <Eye aria-hidden="true" />
          What happens?
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={isInstalled}
          title="Only in this browser, for your own list"
          onClick={() => void toggleInstalled(server.slug)}
          className={cn(
            'ml-auto',
            isInstalled && 'text-green-700 dark:text-green-400',
          )}
        >
          {isInstalled ? (
            <Check aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {isInstalled ? 'Installed here' : 'Mark as installed'}
        </Button>
      </div>
      {whatOpen && (
        <WhatHappensDialog
          servers={servers}
          onClose={() => setWhatOpen(false)}
        />
      )}

      <div className="mt-[22px]">
        <McpAccessLine server={server} />
      </div>
      <div className="mt-[22px]">
        <McpSafetyLines server={server} />
      </div>
      <div className="mt-[22px]">
        <McpToolsTable server={server} />
      </div>
      <div className="mt-[22px]">
        <McpInfoTiles server={server} />
      </div>
    </>
  )
}
