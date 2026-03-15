import { Pencil } from 'lucide-react'
import * as React from 'react'

import { cn } from '~/lib/utils'
import { Button } from '~/ui/button'

export interface InlineEditableFieldProps {
  value: string
  onSave: (value: string) => void
  /** Called when user cancels (Escape) without saving */
  onCancel?: () => void
  multiline?: boolean
  placeholder?: string
  className?: string
  /** Start in edit mode (e.g. for new list items) */
  initialEditMode?: boolean
  /** Optional label for view mode (e.g. render as link) */
  renderView?: (value: string) => React.ReactNode
  /** Optional class for the view container (e.g. for group hover) */
  viewClassName?: string
}

export function InlineEditableField({
  value,
  onSave,
  multiline = false,
  placeholder = '',
  className,
  renderView,
  viewClassName,
  initialEditMode = false,
  onCancel,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(initialEditMode)
  const [editValue, setEditValue] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setEditValue(value)
  }, [value])

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed !== value) {
      onSave(trimmed)
    } else if (trimmed === '' && onCancel) {
      onCancel()
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
    inputRef.current?.blur()
    onCancel?.()
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    const inputProps = {
      ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
      value: editValue,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>,
      ) => setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      placeholder,
      className: cn(
        'w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      ),
    }
    if (multiline) {
      return (
        <textarea
          {...inputProps}
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={4}
        />
      )
    }
    return <input type="text" {...inputProps} />
  }

  const display = value || placeholder || '—'
  return (
    <span className={cn('group inline-flex items-center gap-1', viewClassName)}>
      {renderView ? renderView(value) : <span>{display}</span>}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        aria-label="Edit"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="size-3.5" />
      </Button>
    </span>
  )
}
