import type { Resource } from '@igstack/app-catalog-backend-core'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
import {
  ResourceSubResourceRowActions,
  usePluginUser,
  useSlotFilled,
} from '~/modules/extensions/index'

interface SubResourcesSectionProps {
  subResources: Resource[]
  /** Slug of the parent, for linking to a child's own page. */
  parentSlug: string
  /**
   * The parent itself, for the row-actions slot's payload.
   *
   * Optional, and the Admin column is skipped without it: a row action is about
   * a child *of something*, and a plugin deciding whether it applies needs the
   * parent to decide against.
   */
  parent?: Resource
  /**
   * Initial filter text (#38 item C). When the user reached this app by
   * searching a term that matched a sub-resource, seed the sub-resource filter
   * with that term so the matched child is revealed instead of buried in a
   * long list (e.g. searching "data" → open Cloud Console → the matching
   * account is pre-filtered). Only applied when it actually matches a child.
   */
  initialSearch?: string
  /**
   * What this app calls its children, from the parent's `childrenLabel`.
   *
   * The tab above already uses it, so without it here the tab and the panel it
   * opens disagree — "AWS Accounts" over a heading that says "Sub-Resources".
   * Defaults to the same generic wording the tab falls back to.
   */
  childrenLabel?: string
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

interface SubResourceRowProps {
  resource: Resource
  parentSlug: string
  /**
   * The parent, but ONLY when the Admin column is being rendered — so this one
   * prop carries both "show the cell" and "what to pass it", and the row needs
   * no separate boolean. `undefined` means no Admin cell, which keeps the cells
   * in lockstep with the header and the empty row's `colSpan`, all three
   * derived from `showAdminColumn` in one place above.
   */
  adminParent?: Resource
  user: ReturnType<typeof usePluginUser>
  isHighlighted: boolean
}

/**
 * One row, memoized — which is load-bearing rather than tidiness.
 *
 * Measured on the 667-account table: a filter keystroke that changed no visible
 * row still cost ~400ms and wrote 9 attributes, because every row's element
 * tree was rebuilt and diffed. The browser can build all 33,861 nodes from
 * scratch in ~195ms, so React was spending twice that to change nothing. The
 * work was reconciliation, not the DOM.
 *
 * `memo` makes a keystroke cost one props comparison per row instead. For that
 * to hold, every prop here must be a primitive or a stable reference:
 * `resource` objects come from the parent's `useMemo` filter (same identities),
 * `user` is memoized in `usePluginUser`, and the highlight arrives as a
 * BOOLEAN. Passing `highlightSlug` and comparing inside would change one prop
 * on all 667 rows whenever the highlight moved, re-rendering the whole table to
 * restyle two rows.
 */
function SubResourceRowBase({
  resource: sr,
  parentSlug,
  adminParent,
  user,
  isHighlighted,
}: SubResourceRowProps) {
  // Approvers are Person OR Group slugs; the badge resolves both.
  const approvers = [...new Set(sr.approverSlugs ?? [])]
  const accountId = (sr.extra as Record<string, unknown> | null | undefined)
    ?.awsAccountId as string | undefined

  return (
    <TableRow
      // The row the user asked for, so it reads as "this one" even once the
      // filter is cleared and its siblings come back.
      aria-current={isHighlighted ? 'true' : undefined}
      // `group` so a row-slot contribution can react to the row being hovered
      // or focused (`group-hover:`, `group-focus-within:`). A plugin cannot add
      // this itself — it renders inside the cell, not on the row — and the
      // alternative is every plugin hand-rolling a `tr:hover &` arbitrary
      // variant.
      className={`group ${isHighlighted ? 'bg-primary/[0.06]' : ''}`}
    >
      <TableCell>
        {/* A real link, not a click handler on the row: this is a table of
            resources, each of which has its own page. */}
        <Link
          to="/app/$slug/sub/$subSlug"
          params={{ slug: parentSlug, subSlug: sr.slug }}
          className="font-medium text-sm hover:text-primary hover:underline"
        >
          {sr.displayName}
        </Link>
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
        {sr.ownerPersonSlug && <PersonBadge slug={sr.ownerPersonSlug} />}
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
        {!accountId ? (
          <span className="text-muted-foreground">—</span>
        ) : // The account id is what people copy; when the resource also
        // carries its own `appUrl` that is the console deep link for THAT
        // account, so the id doubles as the launch affordance.
        sr.appUrl ? (
          <a
            href={sr.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline select-text"
          >
            {accountId}
          </a>
        ) : (
          <span className="font-mono text-xs text-muted-foreground select-text">
            {accountId}
          </span>
        )}
      </TableCell>
      {adminParent !== undefined && (
        // `relative`, so a contribution can position something against the
        // cell — a resting-state glyph under a hover-revealed control, for
        // instance. A plugin cannot add it, because the cell is the core's.
        <TableCell className="relative w-[168px]">
          <ResourceSubResourceRowActions
            resource={sr}
            parent={adminParent}
            user={user}
          />
        </TableCell>
      )}
    </TableRow>
  )
}

const SubResourceRow = memo(SubResourceRowBase)

export function SubResourcesSection({
  subResources,
  parentSlug,
  parent,
  initialSearch,
  childrenLabel,
}: SubResourcesSectionProps) {
  // `useSlotFilled`, not "render it and see": the column is layout, so the
  // header has to be decided before any cell renders.
  //
  // ONE flag for the header, the cells and the empty row's colSpan. Deriving it
  // separately per site is how a header appears over a column with no cells —
  // the parent check only guarded the cells at first, and the header rendered
  // anyway.
  const showAdminColumn =
    useSlotFilled('resourceSubResourceRowActions') && parent !== undefined
  const user = usePluginUser()
  // `?sub=<slug>` — the one sub-resource the user asked for, by clicking its row
  // in the search results. It wins over the query-seeded filter below: a query
  // like "project" matches every child, so seeding with it would bury the row
  // that was actually clicked.
  const search_ = useSearch({ strict: false })
  const selectedSubSlug = search_.sub
  const selectedSub = useMemo(
    () => subResources.find((sr) => sr.slug === selectedSubSlug) ?? null,
    [subResources, selectedSubSlug],
  )
  const navigate = useNavigate()

  // The row to mark as "this one". It outlives `?sub=` so clearing the filter
  // brings the siblings back without losing the user's place.
  const [highlightSlug, setHighlightSlug] = useState(selectedSubSlug)
  useEffect(() => {
    if (selectedSubSlug) setHighlightSlug(selectedSubSlug)
  }, [selectedSubSlug])

  // The search input only mounts once the selection is gone, so focus it then.
  const searchInputRef = useRef<HTMLInputElement>(null)
  const focusSearchAfterClearRef = useRef(false)
  useEffect(() => {
    if (!selectedSub && focusSearchAfterClearRef.current) {
      focusSearchAfterClearRef.current = false
      searchInputRef.current?.focus()
    }
  }, [selectedSub])

  const clearSelection = () => {
    focusSearchAfterClearRef.current = true
    // A navigation, not a replace, so Back restores the single-row view.
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, sub: undefined }),
    })
  }

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

  /**
   * The input stays bound to `search`; the TABLE filters on this.
   *
   * Rebuilding the row list is the expensive half of a keystroke — on a large
   * entry it mounts and unmounts hundreds of rows — and doing it in the same
   * render as the input makes the caret wait for it. `useDeferredValue` splits
   * them: React commits the typed character immediately and re-renders the
   * table at low priority, interruptibly. Keep typing and the superseded
   * low-priority render is abandoned rather than finished and thrown away, so
   * a burst costs roughly one filter pass instead of one per character.
   *
   * This only works because the row is memoized. Deferring tells React it MAY
   * skip the expensive subtree between keystrokes; `memo` is what lets it
   * actually skip anything.
   *
   * Not a debounce: there is no fixed delay to tune, nothing is thrown away on
   * a fast typist, and the final result is never late — React yields to input
   * instead of waiting on a timer.
   */
  const deferredSearch = useDeferredValue(search)
  // True while the table is a render behind the box. Used only to dim it, so
  // stale rows read as stale instead of as the answer.
  const isFilterPending = search !== deferredSearch

  // useState only reads its argument on the first render, so without this the
  // filter kept the query from whenever this panel first mounted — searching
  // again with the panel already open left the old term in the box.
  useEffect(() => setSearch(seededSearch), [seededSearch])

  const uniqueTiers = useMemo(() => {
    const tiers = new Set<string>()
    for (const sr of subResources) {
      if (sr.tier) tiers.add(sr.tier)
    }
    return [...tiers].sort()
  }, [subResources])

  const filtered = useMemo(() => {
    if (selectedSub) return [selectedSub]

    let result = subResources

    if (tierFilter !== 'all') {
      result = result.filter((sr) => sr.tier === tierFilter)
    }

    if (deferredSearch.trim()) {
      const q = deferredSearch.trim().toLowerCase()
      result = result.filter(
        (sr) =>
          sr.displayName.toLowerCase().includes(q) ||
          (sr.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
          (sr.description?.toLowerCase().includes(q) ?? false) ||
          // `extra` is nullable on a served resource, and the cast hid that:
          // dereferencing it threw a TypeError the moment anything typed into
          // this box met a child without it, taking the whole table down.
          (
            (sr.extra as Record<string, unknown> | null | undefined)
              ?.awsAccountId as string | undefined
          )?.includes(q) === true,
      )
    }

    return result
  }, [subResources, deferredSearch, tierFilter, selectedSub])

  if (subResources.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {/* `data-testid`, because the label is now deployment-defined: the test
            kit used to locate this heading by matching the literal string
            "Sub-Resources (n of m)", which silently stopped finding it the
            moment a catalog named its children something else. */}
        <div
          data-testid="sub-resources-heading"
          className="text-sm font-medium"
        >
          {/* Each site keeps the exact wording it had before `childrenLabel`
              existed, so a deployment that names nothing renders identically —
              the heading and the placeholder never agreed, and quietly making
              them agree would change every existing catalog. */}
          {childrenLabel ?? 'Sub-Resources'} ({filtered.length} of{' '}
          {subResources.length})
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {selectedSub ? (
          // `?sub=` wins over the search box, so show it where the box would be
          // and make it dismissible — otherwise the only way out is the URL.
          <div className="flex flex-1 items-center">
            <Badge variant="secondary" className="h-9 gap-1 pl-3 pr-1 text-sm">
              Showing: {selectedSub.displayName}
              <button
                type="button"
                aria-label="Clear sub-resource filter"
                onClick={clearSelection}
                className="rounded-sm p-1 hover:bg-muted-foreground/20"
              >
                <X className="size-4" />
              </button>
            </Badge>
          </div>
        ) : (
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              // Verbatim, not lower-cased: the deployment chose the casing and
              // an acronym does not survive it — "AWS Accounts" became
              // "Search aws accounts…". The no-label default stays lowercase
              // because that is the wording this placeholder already had.
              placeholder={`Search ${childrenLabel ?? 'resources'} by name or alias...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
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

      {/* Table.
          The vertical scroll sits on the Table's own wrapper rather than here,
          so the sticky header below pins to the element that actually scrolls —
          see the comment on `stickyHeader`. */}
      {/* Dimmed while the rows are a render behind the filter box, so stale
          rows read as stale rather than as the answer. `aria-busy` says the
          same thing to a screen reader. Opacity only — no spinner and no
          layout change, because on a fast filter this lasts one frame and
          anything heavier would strobe. */}
      <div
        className="rounded-lg border overflow-hidden"
        aria-busy={isFilterPending || undefined}
      >
        <Table
          stickyHeader
          className={`max-h-[400px] transition-opacity ${
            isFilterPending ? 'opacity-60' : ''
          }`}
        >
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">Tier</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Approvers</TableHead>
              <TableHead className="w-[140px]">AWS Account</TableHead>
              {/* Only when something fills it: an empty column with a header and
                  no cells is worse than no column, and the open-source build
                  registers no plugins at all. */}
              {showAdminColumn && (
                <TableHead className="w-[168px]">Admin</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showAdminColumn ? 6 : 5}
                  className="text-center text-muted-foreground py-8"
                >
                  No resources match your filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((sr) => (
                <SubResourceRow
                  key={sr.slug}
                  resource={sr}
                  parentSlug={parentSlug}
                  // One prop for "render the Admin cell, with this parent".
                  // `showAdminColumn` already implies `parent !== undefined`,
                  // so this cannot disagree with the header or the colSpan.
                  adminParent={showAdminColumn ? parent : undefined}
                  user={user}
                  isHighlighted={sr.slug === highlightSlug}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
