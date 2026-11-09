import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/ui/tooltip'
import { SIGN_IN, STATUS_CHIP } from './signIn'
import { Triad } from './Triad'

/** One line of the home list: Triad, name, sign-in icon and a status chip. */
export function McpServerRow({ server }: { server: CatalogMcpServer }) {
  const signIn = SIGN_IN[server.auth.kind]
  const status = STATUS_CHIP[server.status]
  return (
    <li
      data-testid="mcp-row"
      className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-card hover:shadow-[0_0_0_1px_var(--border)]"
    >
      <Triad server={server} size={28} />
      <span
        data-testid="mcp-row-name"
        className="min-w-0 flex-1 truncate text-[13.5px] font-bold"
        title={server.displayName}
      >
        {server.displayName}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            aria-label={signIn.tip}
            className="inline-flex text-muted-foreground"
          >
            <signIn.Icon aria-hidden="true" className="size-[13px]" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{signIn.tip}</TooltipContent>
      </Tooltip>
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
    </li>
  )
}
