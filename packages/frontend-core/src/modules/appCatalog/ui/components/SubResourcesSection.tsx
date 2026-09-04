import type { Resource } from '@igstack/app-catalog-backend-core'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '~/ui/badge'
import { Input } from '~/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/ui/table'
import { PersonBadge, PersonOrGroupBadge } from './PersonBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/ui/select'
import { markdownToPlainText } from '~/modules/appCatalog/utils/markdownToPlainText'

interface SubResourcesSectionProps {
  subResources: Resource[]
  /**
   * Initial filter text (#38 item C). When the user reached this app by
   * searching a term that matched a sub-resource, seed the sub-resource filter
   * with that term so the matched child is revealed instead of buried in a
   * long list (e.g. searching "data" → open Cloud Console → the matching
   * account is pre-filtered). Only applied when it actually matches a child.
   */
  initialSearch?: string
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

export function SubResourcesSection({
  subResources,
  initialSearch,
}: SubResourcesSectionProps) {
  // Seed the filter with the incoming query ONLY if it matches a child, so we
  // reveal the matched sub-resource without hiding everything on a non-match.
  const seededSearch = useMemo(() => {
    const q = initialSearch?.trim().toLowerCase()
    if (!q) return ''
    const hit = subResources.some(
      (sr) =>
        sr.displayName.toLowerCase().includes(q) ||
        (sr.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    )
    return hit ? initialSearch!.trim() : ''
  }, [initialSearch, subResources])
  const [search, setSearch] = useState(seededSearch)
  const [tierFilter, setTierFilter] = useState<string>('all')

  const uniqueTiers = useMemo(() => {
    const tiers = new Set<string>()
    for (const sr of subResources) {
      if (sr.tier) tiers.add(sr.tier)
    }
    return [...tiers].sort()
  }, [subResources])

  const filtered = useMemo(() => {
    let result = subResources

    if (tierFilter !== 'all') {
      result = result.filter((sr) => sr.tier === tierFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (sr) =>
          sr.displayName.toLowerCase().includes(q) ||
          (sr.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
          (sr.description?.toLowerCase().includes(q) ?? false) ||
          (
            (sr.extra as Record<string, unknown>).awsAccountId as
              | string
              | undefined
          )?.includes(q) === true,
      )
    }

    return result
  }, [subResources, search, tierFilter])

  if (subResources.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Sub-Resources ({filtered.length} of {subResources.length})
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search resources by name or alias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {uniqueTiers.length > 1 && (
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {uniqueTiers.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">Tier</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Approvers</TableHead>
              <TableHead className="w-[140px]">AWS Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No resources match your filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sr) => {
                // Approvers are Person OR Group slugs; the badge resolves both.
                const approvers = [...new Set(sr.approverSlugs ?? [])]

                return (
                  <TableRow key={sr.slug}>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {sr.displayName}
                      </div>
                      {(sr.aliases ?? []).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {(sr.aliases ?? []).join(', ')}
                        </div>
                      )}
                      {sr.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {markdownToPlainText(sr.description)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {sr.tier && (
                        <Badge
                          variant={getTierBadgeVariant(sr.tier)}
                          className={`text-xs ${getTierBadgeClassName(sr.tier)}`}
                        >
                          {getTierDisplayLabel(sr.tier)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sr.ownerPersonSlug && (
                        <PersonBadge slug={sr.ownerPersonSlug} />
                      )}
                    </TableCell>
                    <TableCell>
                      {approvers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {approvers.map((slug) => (
                            <PersonOrGroupBadge key={slug} slug={slug} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const accountId = (
                          sr.extra as Record<string, unknown> | null | undefined
                        )?.awsAccountId as string | undefined
                        return accountId ? (
                          <span className="font-mono text-xs text-muted-foreground select-text">
                            {accountId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      })()}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
