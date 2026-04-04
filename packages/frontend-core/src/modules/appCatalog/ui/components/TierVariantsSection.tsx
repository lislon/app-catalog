import type {
  AppAccessRequest,
  AppApprovalMethod,
  AppTierVariant,
} from '@igstack/app-catalog-backend-core'
import { Bot, ExternalLinkIcon, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Badge } from '~/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/ui/table'
import { useAppCatalogContext } from '~/modules/appCatalog'
import { PersonBadge } from './PersonBadge'

interface TierVariantsSectionProps {
  tiers: AppTierVariant[]
}

function getTierBadgeVariant(
  tierSlug: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (tierSlug === 'prod' || tierSlug === 'production') return 'destructive'
  if (tierSlug === 'dev' || tierSlug === 'staging') return 'secondary'
  if (tierSlug === 'preprod') return 'outline'
  if (tierSlug === 'sandbox') return 'outline'
  return 'outline'
}

function getTierBadgeClassName(tierSlug: string): string {
  if (tierSlug === 'preprod')
    return 'border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200'
  if (tierSlug === 'sandbox')
    return 'border-gray-400 bg-gray-100 text-gray-700 hover:bg-gray-200'
  return ''
}

function getTierDisplayLabel(tierSlug: string): string {
  if (tierSlug === 'preprod') return 'Pre-Prod'
  if (tierSlug === 'sandbox') return 'Sandbox'
  if (tierSlug === 'prod' || tierSlug === 'production') return 'Prod'
  if (tierSlug === 'dev') return 'Dev'
  if (tierSlug === 'staging') return 'Staging'
  return tierSlug
}

function getAccessIcon(type: string): React.ReactNode {
  switch (type) {
    case 'service':
      return <Bot className="size-4 text-primary shrink-0" />
    case 'personTeam':
      return <Users className="size-4 text-primary shrink-0" />
    default:
      return <Settings className="size-4 text-primary shrink-0" />
  }
}

/** Compact inline access detail for a tier row */
function TierAccessDetail({
  accessRequest,
  methods,
}: {
  accessRequest: AppAccessRequest
  methods: AppApprovalMethod[]
}) {
  const [expanded, setExpanded] = useState(false)
  const method = methods.find(
    (m) => m.slug === accessRequest.approvalMethodSlug,
  )

  const hasExtra =
    accessRequest.comments ||
    accessRequest.urls?.length ||
    accessRequest.approverPersonSlugs?.length ||
    accessRequest.postApprovalInstructions

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {method && getAccessIcon(method.type)}
        {method?.type === 'service' && method.config.url ? (
          <a
            href={method.config.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            {method.displayName}
            <ExternalLinkIcon className="size-3" />
          </a>
        ) : (
          <span className="text-sm">
            {method?.displayName ?? accessRequest.approvalMethodSlug}
          </span>
        )}
        {hasExtra && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-primary ml-1"
          >
            {expanded ? 'less' : 'more...'}
          </button>
        )}
      </div>
      {expanded && (
        <div className="pl-5 space-y-1.5 text-xs">
          {accessRequest.comments && (
            <div className="text-muted-foreground prose prose-xs max-w-none">
              <ReactMarkdown>{accessRequest.comments}</ReactMarkdown>
            </div>
          )}
          {accessRequest.urls && accessRequest.urls.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {accessRequest.urls.map((urlObj, idx) => (
                <a
                  key={`${urlObj.url}-${idx}`}
                  href={urlObj.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {urlObj.label || urlObj.url.replace(/^https?:\/\//, '')}
                  <ExternalLinkIcon className="size-3" />
                </a>
              ))}
            </div>
          )}
          {accessRequest.approverPersonSlugs &&
            accessRequest.approverPersonSlugs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {accessRequest.approverPersonSlugs.map((slug) => (
                  <PersonBadge key={slug} slug={slug} />
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export function TierVariantsSection({ tiers }: TierVariantsSectionProps) {
  const { approvalMethods } = useAppCatalogContext()

  if (tiers.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Environment Tiers</div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Tier</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => (
              <TableRow key={tier.tierSlug}>
                <TableCell>
                  <Badge
                    variant={getTierBadgeVariant(tier.tierSlug)}
                    className={getTierBadgeClassName(tier.tierSlug)}
                  >
                    {getTierDisplayLabel(tier.tierSlug)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {tier.displayName ?? tier.tierSlug}
                </TableCell>
                <TableCell>
                  {tier.appUrl ? (
                    <a
                      href={tier.appUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {tier.appUrl.replace(/^https?:\/\//, '')}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {tier.accessRequest ? (
                    <TierAccessDetail
                      accessRequest={tier.accessRequest}
                      methods={approvalMethods}
                    />
                  ) : (
                    <span className="text-muted-foreground">Same as app</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
