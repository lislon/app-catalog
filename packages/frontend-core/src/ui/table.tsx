import * as React from 'react'

import { cn } from '~/lib/utils'

interface TableProps extends React.ComponentProps<'table'> {
  /**
   * Keep the header visible while the body scrolls.
   *
   * The scroll has to be on the container BELOW, not on an ancestor, and that is
   * the whole difficulty: this container sets `overflow-x: auto`, which per spec
   * makes `overflow-y: visible` compute to `auto` as well. So it is already a
   * scrollport on both axes, and `position: sticky` on the header resolves
   * against it rather than against whatever ancestor has the height limit.
   * Putting the height limit anywhere above leaves the header pinned to an
   * element that never scrolls vertically — it scrolls away exactly as if
   * nothing had been set.
   *
   * Pass the max height as `className` (e.g. `max-h-[400px]`); it lands on this
   * container, which then both clips and scrolls.
   */
  stickyHeader?: boolean
}

function Table({ className, stickyHeader, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full overflow-x-auto',
        stickyHeader && 'overflow-y-auto',
        stickyHeader && className,
      )}
    >
      <table
        data-slot="table"
        className={cn(
          'w-full caption-bottom text-sm',
          // The header's own bottom border does not render reliably once the
          // row is sticky, so the separating line comes from an inset shadow on
          // the cells instead. Opaque background, or rows show through it.
          stickyHeader &&
            '[&>thead]:sticky [&>thead]:top-0 [&>thead]:z-10 [&>thead>tr]:border-b-0 [&>thead_th]:bg-background [&>thead_th]:shadow-[inset_0_-1px_0_var(--border)]',
          !stickyHeader && className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'bg-muted/50 border-t font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
}
