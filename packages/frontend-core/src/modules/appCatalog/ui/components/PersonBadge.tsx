import type { Group } from '@igstack/app-catalog-backend-core'
import { Check, Copy, Mail, User, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '~/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '~/ui/popover'
import { useAppCatalogContext } from '~/modules/appCatalog'
import {
  getGroupBySlug,
  getPersonBySlug,
} from '~/modules/appCatalog/utils/resolveHelpers'

interface PersonBadgeProps {
  slug: string
}

/**
 * Person chip. Clicking it opens a small popover exposing BOTH the full name
 * and the email, each with its own copy button — so the user picks what to copy
 * (previously a single button copied only the email). Email also links to
 * mailto:. Falls back to just the name (no popover) when no email is known.
 */
export function PersonBadge({ slug }: PersonBadgeProps) {
  const { persons } = useAppCatalogContext()
  const person = getPersonBySlug(persons, slug)

  const displayName = person
    ? `${person.firstName} ${person.lastName}`.trim() || slug
    : slug
  const email = person?.email

  // No email → nothing to pick between; render a plain, non-interactive chip.
  if (!email) {
    return (
      <Badge
        variant="outline"
        className="font-normal inline-flex items-center gap-1"
        title={displayName}
      >
        <User className="size-3" />
        {displayName}
      </Badge>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex"
          title={`${displayName} · ${email}`}
        >
          <Badge
            variant="outline"
            className="font-normal inline-flex items-center gap-1 cursor-pointer hover:border-primary transition-colors"
          >
            <User className="size-3" />
            {displayName}
            <Copy className="size-3 opacity-50" />
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <CopyRow
          icon={<User className="size-3.5" />}
          label="Name"
          value={displayName}
        />
        <CopyRow
          icon={<Mail className="size-3.5" />}
          label="Email"
          value={email}
          href={`mailto:${email}`}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Chip for a slug that may name EITHER a Person or a Group (owner, approvers).
 * Resolves against both collections; falls back to the raw slug so an unknown
 * slug is still visible rather than silently dropped.
 */
export function PersonOrGroupBadge({ slug }: PersonBadgeProps) {
  const { persons, groups } = useAppCatalogContext()

  if (getPersonBySlug(persons, slug)) return <PersonBadge slug={slug} />

  const group = getGroupBySlug(groups, slug)
  if (!group) {
    return (
      <Badge variant="outline" className="font-normal" title={slug}>
        {slug}
      </Badge>
    )
  }
  return <GroupBadge group={group} />
}

/** Group chip: name, optional email, and the member names in a popover. */
function GroupBadge({ group }: { group: Group }) {
  const { persons } = useAppCatalogContext()
  const displayName = group.displayName || group.slug
  const memberNames = group.memberSlugs.map((s) => {
    const p = getPersonBySlug(persons, s)
    return p ? `${p.firstName} ${p.lastName}`.trim() || s : s
  })

  if (!group.email && memberNames.length === 0) {
    return (
      <Badge
        variant="outline"
        className="font-normal inline-flex items-center gap-1"
        title={displayName}
      >
        <Users className="size-3" />
        {displayName}
      </Badge>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex" title={displayName}>
          <Badge
            variant="outline"
            className="font-normal inline-flex items-center gap-1 cursor-pointer hover:border-primary transition-colors"
          >
            <Users className="size-3" />
            {displayName}
            <Copy className="size-3 opacity-50" />
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <CopyRow
          icon={<Users className="size-3.5" />}
          label="Group"
          value={displayName}
        />
        {group.email && (
          <CopyRow
            icon={<Mail className="size-3.5" />}
            label="Email"
            value={group.email}
            href={`mailto:${group.email}`}
          />
        )}
        {memberNames.length > 0 && (
          <div className="px-2 py-1.5">
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Members
            </span>
            <span className="block text-[13px]">{memberNames.join(', ')}</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** One copyable field (label + value + copy button), value optionally a link. */
function CopyRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      void navigator.clipboard.writeText(value)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    },
    [value],
  )

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {href ? (
          <a
            href={href}
            className="block truncate text-[13px] text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="block truncate text-[13px]">{value}</span>
        )}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary hover:bg-background transition-colors"
        title={copied ? 'Copied!' : `Copy ${label.toLowerCase()}`}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? (
          <Check className="size-3.5 text-green-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  )
}
