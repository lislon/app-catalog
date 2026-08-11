import { ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { InputGroup, InputGroupInput } from '~/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/ui/table'
import { useAppCatalogContext } from '../../context/AppCatalogContext'

/**
 * Service Desks view (#9): a searchable table of all service-desk approval
 * methods (type === 'service'), each with a link that opens its portal in a new
 * tab. Data rides in on the existing app-catalog query (context.approvalMethods).
 */
export function ServiceDesksPage() {
  const { approvalMethods } = useAppCatalogContext()
  const [search, setSearch] = useState('')

  const desks = useMemo(() => {
    const services = approvalMethods.filter((m) => m.type === 'service')
    const q = search.trim().toLowerCase()
    const filtered = q
      ? services.filter((m) => m.displayName.toLowerCase().includes(q))
      : services
    return [...filtered].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    )
  }, [approvalMethods, search])

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <InputGroup className="max-w-sm">
        <InputGroupInput
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="Search service desks by name…"
          aria-label="Search service desks"
        />
      </InputGroup>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {desks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No service desks found{search && ` for "${search}"`}.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Desk</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {desks.map((desk) => {
                const url = desk.config.url
                const description = desk.config.description
                return (
                  <TableRow
                    key={desk.slug}
                    className={
                      url ? 'cursor-pointer hover:bg-muted/50' : undefined
                    }
                    onClick={
                      url
                        ? () =>
                            window.open(url, '_blank', 'noopener,noreferrer')
                        : undefined
                    }
                  >
                    <TableCell className="font-medium align-top">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline"
                          data-testid="service-desk-name"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {desk.displayName}
                        </a>
                      ) : (
                        <span data-testid="service-desk-name">
                          {desk.displayName}
                        </span>
                      )}
                      {description && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {description}
                        </span>
                      )}
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary hover:underline"
                          title={url}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {url.replace(/^https?:\/\//, '')}
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {url ? (
                        <ExternalLink className="size-4 text-primary/50" />
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
