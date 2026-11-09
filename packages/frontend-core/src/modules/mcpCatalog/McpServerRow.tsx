import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/ui/tooltip'
import { CartButton } from './cart/McpCart'
import { SIGN_IN, STATUS_CHIP } from './signIn'
import { Triad } from './Triad'

/**
 * One line of the home list: Triad, name, sign-in icon and a status chip. The
 * name's link covers the row and opens the server's dialog, keeping the search.
 */
export function McpServerRow({
  server,
  installed,
}: {
  server: CatalogMcpServer
  /** Marked installed in this browser: greyed, with a badge. */
  installed: boolean
}) {
  const signIn = SIGN_IN[server.auth.kind]
  const status = STATUS_CHIP[server.status]
  return (
    <li
      data-testid="mcp-row"
      data-installed={installed || undefined}
      className={cn(
        'relative flex min-h-10 items-center gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-card hover:shadow-[0_0_0_1px_var(--border)]',
        installed && 'opacity-55 hover:opacity-90',
      )}
    >
      <span className="relative z-10 inline-flex">
        <Triad server={server} size={28} />
      </span>
      <Link
        to="/mcp/$slug"
        params={{ slug: server.slug }}
        search={(prev) => prev}
        data-testid="mcp-row-name"
        className="min-w-0 flex-1 truncate rounded-sm text-[13.5px] font-bold outline-none after:absolute after:inset-0 after:rounded-[10px] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
        title={server.displayName}
      >
        {server.displayName}
      </Link>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            aria-label={signIn.tip}
            className="relative z-10 inline-flex text-muted-foreground"
          >
            <signIn.Icon aria-hidden="true" className="size-[13px]" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{signIn.tip}</TooltipContent>
      </Tooltip>
      {installed && (
        <span
          title="You marked this as installed in this browser"
          className="rounded-full bg-green-600/15 px-1.5 py-0.5 text-[10px] leading-none font-bold text-green-700 dark:text-green-300"
        >
          Installed
        </span>
      )}
      {status && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold',
            status.className,
          )}
        >
          {status.label}
        </span>
      )}
      <CartButton server={server} small />
    </li>
  )
}
