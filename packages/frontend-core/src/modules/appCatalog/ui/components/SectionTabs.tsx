import { Link, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '~/api/infra/trpc'
import { cn } from '~/lib/utils'

/**
 * The header's section tabs: one captioned link per section, so each is
 * deep-linkable. The active tab is derived from the pathname rather than an
 * exact-match Link, because Catalog must stay active on the app-detail routes
 * (`/app/<slug>`, #23) and on `/catalog/apps`, which renders the same page.
 * Community tools is hidden until the server says the feature is on.
 */
export function SectionTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const trpc = useTRPC()
  const { data: communityConfig } = useQuery(
    trpc.communityTools.config.queryOptions(),
  )

  const tabs = [
    {
      to: '/',
      title: 'Catalog',
      caption: 'Official company apps',
      active:
        pathname === '/' ||
        pathname.startsWith('/app/') ||
        pathname.startsWith('/catalog/'),
    },
    ...(communityConfig?.enabled
      ? [
          {
            to: '/community',
            title: 'Community tools',
            caption: 'Built by colleagues',
            active: pathname.startsWith('/community'),
          } as const,
        ]
      : []),
    {
      to: '/service-desks',
      title: 'Service Desks',
      caption: 'Where to file a ticket',
      active: pathname.startsWith('/service-desks'),
    },
  ] as const

  return (
    <div
      role="tablist"
      aria-label="Sections"
      data-testid="section-tabs"
      className="flex items-stretch gap-2"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={tab.active ? 'page' : undefined}
          className={cn(
            'flex flex-col items-start rounded-sm border-b-2 px-3.5 py-1.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            tab.active
              ? 'border-primary text-foreground'
              : 'border-transparent text-foreground/90 hover:text-primary',
          )}
        >
          <span className="text-base font-semibold">{tab.title}</span>
          <span
            className={cn(
              'text-xs',
              tab.active ? 'text-muted-foreground' : 'text-foreground/80',
            )}
          >
            {tab.caption}
          </span>
        </Link>
      ))}
    </div>
  )
}
