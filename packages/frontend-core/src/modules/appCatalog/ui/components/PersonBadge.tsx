import { Check, Copy, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '~/ui/badge'
import { useAppCatalogContext } from '~/modules/appCatalog'
import { getPersonBySlug } from '~/modules/appCatalog/utils/resolveHelpers'

interface PersonBadgeProps {
  slug: string
}

export function PersonBadge({ slug }: PersonBadgeProps) {
  const { persons } = useAppCatalogContext()
  const person = getPersonBySlug(persons, slug)

  const displayName = person
    ? `${person.firstName} ${person.lastName}`.trim() || slug
    : slug

  const email = person?.email

  return (
    <Badge
      variant="outline"
      className="font-normal inline-flex items-center gap-1"
      title={email ? `${displayName} (${email})` : displayName}
    >
      <User className="size-3" />
      {displayName}
      {email && <CopyEmailButton email={email} />}
    </Badge>
  )
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(email)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    },
    [email],
  )

  return (
    <button
      onClick={handleCopy}
      className="ml-0.5 hover:text-primary transition-colors"
      title={copied ? 'Copied!' : `Copy ${email}`}
      type="button"
    >
      {copied ? (
        <Check className="size-3 text-green-600" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  )
}
