import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useAppCatalogContext } from '../appCatalog/context/AppCatalogContext'
import { ResourceIcon } from '../appCatalog/ui/catalog/ResourceIcon'

const CHIP =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-0.5 pr-2.5 text-[13px] font-bold text-foreground'

/** The apps you need an account in first, each a chip to its catalog card. */
export function McpAccessLine({ server }: { server: CatalogMcpServer }) {
  const { resources } = useAppCatalogContext()
  const slugs = server.requiredAppSlugs ?? []

  if (slugs.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[13.5px]">
        <Check
          aria-hidden="true"
          className="size-4 text-green-600 dark:text-green-400"
        />
        No extra access needed. Works with the account you already have.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[13.5px]">
      To use this MCP you need access to:
      {slugs.map((slug) => {
        const app = resources.find((r) => r.slug === slug)
        // No card to open for a slug the catalog does not list.
        if (!app) {
          return (
            <span key={slug} className={`${CHIP} pl-2.5`}>
              {slug}
            </span>
          )
        }
        return (
          <Link
            key={slug}
            to="/app/$slug"
            params={{ slug }}
            className={`${CHIP} pl-[3px] transition-colors hover:border-ring`}
          >
            <ResourceIcon app={app} size={20} rounded="rounded-full" />
            {app.displayName}
          </Link>
        )
      })}
    </div>
  )
}
