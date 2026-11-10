import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import {
  Check,
  Eye,
  Share2,
  ShoppingCart,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '~/lib/utils'
import { Button } from '~/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/ui/tooltip'
import { InstallButton } from '../install/InstallButton'
import { copyText, useCopyFlash } from '../install/installOptions'
import { WhatHappensDialog } from '../install/WhatHappensDialog'
import { useSensitiveDataLabel } from '../useMcpCatalogConfig'
import { useMcpCart } from './useMcpCart'

const ON_DARK =
  'inline-flex min-h-8 items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2.5 text-[13px] font-bold text-white hover:bg-white/15 [&_svg]:size-4'

/**
 * Adds `server` to the cart or takes it out. The full button is one width
 * whichever it says; `small` is the home list's icon, named for assistive tech.
 */
export function CartButton({
  server,
  small = false,
}: {
  server: CatalogMcpServer
  small?: boolean
}) {
  const { has, toggle } = useMcpCart()
  const inCart = has(server.slug)
  const Icon = inCart ? Check : ShoppingCart
  const pressed =
    'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90'

  if (small) {
    const tip = inCart ? 'In your cart' : 'Add to cart'
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-pressed={inCart}
            aria-label={`${inCart ? 'Remove' : 'Add'} ${server.displayName} ${inCart ? 'from' : 'to'} cart`}
            onClick={() => toggle(server.slug)}
            className={cn(
              'relative z-10 grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:border-ring hover:text-foreground',
              pressed,
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      aria-pressed={inCart}
      onClick={() => toggle(server.slug)}
      className={cn('w-[120px]', pressed)}
    >
      <Icon aria-hidden="true" />
      {inCart ? 'In cart' : 'Add to cart'}
    </Button>
  )
}

/**
 * The cart bar, fixed at the bottom while the cart has anything: a chip per
 * server, a warning when any has sensitive data, Share, What happens? and
 * Install for all of them.
 */
export function McpCart() {
  const { servers, toggle, shareUrl } = useMcpCart()
  const sensitiveLabel = useSensitiveDataLabel()
  const [whatOpen, setWhatOpen] = useState(false)
  const [flash, setFlash] = useCopyFlash()

  if (servers.length === 0) return null
  const sensitive = servers.filter((s) => s.sensitiveData)

  return (
    <div
      role="region"
      aria-label="Your cart"
      className="fixed bottom-4 left-1/2 z-40 flex w-[min(1100px,calc(100vw-32px))] -translate-x-1/2 flex-wrap items-center gap-3.5 rounded-[calc(var(--radius)+6px)] bg-stone-900 py-3 pr-3.5 pl-[18px] text-white shadow-2xl ring-1 ring-white/10 dark:bg-stone-800"
    >
      <span
        data-testid="mcp-cart-title"
        className="inline-flex items-center gap-2 font-serif text-lg font-semibold whitespace-nowrap"
      >
        <ShoppingCart aria-hidden="true" className="size-[18px]" />
        Cart · {servers.length}
      </span>
      <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-1.5 p-0">
        {servers.map((s) => (
          <li
            key={s.slug}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 py-[3px] pr-1 pl-2.5 text-[12.5px] font-bold"
          >
            <span data-testid="mcp-cart-item">{s.displayName}</span>
            <button
              type="button"
              aria-label={`Remove ${s.displayName}`}
              onClick={() => toggle(s.slug)}
              className="grid size-[22px] place-items-center rounded-full opacity-70 hover:bg-white/15 hover:opacity-100"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      {sensitive.length > 0 && (
        <span
          title={`${sensitiveLabel}: ${sensitive.map((s) => s.displayName).join(', ')}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-300"
        >
          <TriangleAlert aria-hidden="true" className="size-3.5" />
          <span data-testid="mcp-cart-warning">{sensitiveLabel}</span>
        </span>
      )}
      <button
        type="button"
        title="Copy a link that opens this page with the same cart"
        onClick={() =>
          void copyText(shareUrl()).then((ok) =>
            setFlash(ok ? 'copied' : 'copy-failed'),
          )
        }
        className={cn(ON_DARK, flash === 'copy-failed' && 'text-red-300')}
      >
        {flash === 'copied' ? (
          <Check aria-hidden="true" />
        ) : flash === 'copy-failed' ? (
          <TriangleAlert aria-hidden="true" />
        ) : (
          <Share2 aria-hidden="true" />
        )}
        {flash === 'copied'
          ? 'Link copied'
          : flash === 'copy-failed'
            ? 'Copy failed'
            : 'Share'}
      </button>
      <button
        type="button"
        onClick={() => setWhatOpen(true)}
        className={ON_DARK}
      >
        <Eye aria-hidden="true" />
        What happens?
      </button>
      <InstallButton servers={servers} tone="dark" />
      {whatOpen && (
        <WhatHappensDialog
          servers={servers}
          onClose={() => setWhatOpen(false)}
        />
      )}
    </div>
  )
}
