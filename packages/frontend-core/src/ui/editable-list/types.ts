import type { ColumnDef } from '@tanstack/react-table'

export interface EditableListFieldProps<T> {
  value: T[]
  onChange: (value: T[]) => void
  columns: ColumnDef<T>[]
  renderForm: (props: {
    item: T | null
    onSave: (item: T) => void
    onCancel: () => void
  }) => React.ReactNode
  createEmpty: () => T
  getItemKey: (item: T, index: number) => string
  label?: string
  addButtonLabel?: string
  emptyMessage?: string
  disabled?: boolean
}
