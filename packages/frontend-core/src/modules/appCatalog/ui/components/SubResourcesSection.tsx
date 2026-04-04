import type { SubResource } from '@igstack/app-catalog-backend-core'
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
import { PersonBadge } from './PersonBadge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/ui/select'
import { useAppCatalogContext } from '~/modules/appCatalog'
import { getGroupBySlug } from '~/modules/appCatalog/utils/resolveHelpers'

interface SubResourcesSectionProps {
  subResources: SubResource[]
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
}: SubResourcesSectionProps) {
  const { groups } = useAppCatalogContext()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')

  const uniqueTiers = useMemo(() => {
    const tiers = new Set<string>()
    for (const sr of subResources) {
      if (sr.tierSlug) tiers.add(sr.tierSlug)
    }
    return [...tiers].sort()
  }, [subResources])

  const filtered = useMemo(() => {
    let result = subResources

    if (tierFilter !== 'all') {
      result = result.filter((sr) => sr.tierSlug === tierFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (sr) =>
          sr.displayName.toLowerCase().includes(q) ||
          sr.aliases.some((a) => a.toLowerCase().includes(q)) ||
          (sr.description?.toLowerCase().includes(q) ?? false),
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
              <TableHead>Access Contacts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No resources match your filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sr) => {
                // Resolve maintainer group members
                const maintainerMembers = sr.accessMaintainerGroupSlugs.flatMap(
                  (groupSlug) => {
                    const group = getGroupBySlug(groups, groupSlug)
                    return group?.memberSlugs ?? []
                  },
                )
                // Deduplicate
                const uniqueMaintainers = [...new Set(maintainerMembers)]

                return (
                  <TableRow key={sr.slug}>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {sr.displayName}
                      </div>
                      {sr.aliases.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {sr.aliases.join(', ')}
                        </div>
                      )}
                      {sr.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {sr.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {sr.tierSlug && (
                        <Badge
                          variant={getTierBadgeVariant(sr.tierSlug)}
                          className={`text-xs ${getTierBadgeClassName(sr.tierSlug)}`}
                        >
                          {getTierDisplayLabel(sr.tierSlug)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sr.ownerPersonSlug && (
                        <PersonBadge slug={sr.ownerPersonSlug} />
                      )}
                    </TableCell>
                    <TableCell>
                      {uniqueMaintainers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {uniqueMaintainers.map((personSlug) => (
                            <PersonBadge key={personSlug} slug={personSlug} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
