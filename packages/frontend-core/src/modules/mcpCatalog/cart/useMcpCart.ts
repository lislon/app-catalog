import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { useAppCatalogContext } from '../../appCatalog/context/AppCatalogContext'

/** `?cart=` as written: slugs in order, blanks dropped. */
function parseCart(raw: string | undefined): string[] {
  return (raw ?? '').split(',').filter(Boolean)
}

/**
 * The cart, kept in `?cart=` so the URL is its only home and a link shares
 * it. Unknown and repeated slugs are ignored and left in the URL as written.
 */
export function useMcpCart() {
  const { mcpServers } = useAppCatalogContext()
  const { cart: raw } = useSearch({ strict: false })
  // Unscoped, so `to: '.'` keeps an open server's dialog.
  const navigate = useNavigate()
  const router = useRouter()

  const servers = useMemo((): CatalogMcpServer[] => {
    const bySlug = new Map(mcpServers?.map((s) => [s.slug, s]))
    return [...new Set(parseCart(raw))].flatMap((slug) => {
      const server = bySlug.get(slug)
      return server ? [server] : []
    })
  }, [raw, mcpServers])
  const slugs = useMemo(() => servers.map((s) => s.slug), [servers])

  const write = useCallback(
    (next: string[]) =>
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, cart: next.join(',') || undefined }),
        replace: true,
      }),
    [navigate],
  )

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs])
  const toggle = useCallback(
    (slug: string) =>
      write(
        slugs.includes(slug)
          ? slugs.filter((s) => s !== slug)
          : [...slugs, slug],
      ),
    [slugs, write],
  )

  /** A link to the list with this cart, and nothing else from this page. */
  const shareUrl = useCallback(() => {
    const url = new URL(
      router.buildLocation({ to: '/mcp' }).href,
      window.location.origin,
    )
    // Literal commas: the link reads as `?cart=a,b`.
    url.search = `cart=${slugs.map(encodeURIComponent).join(',')}`
    return url.href
  }, [router, slugs])

  return { servers, has, toggle, shareUrl }
}
