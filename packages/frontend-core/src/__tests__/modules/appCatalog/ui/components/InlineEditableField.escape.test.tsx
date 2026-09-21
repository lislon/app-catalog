import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { InlineEditableField } from '~/modules/appCatalog/ui/components/InlineEditableField'

describe('InlineEditableField — Esc', () => {
  const onDocumentEscape = vi.fn()
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onDocumentEscape()
  }
  document.addEventListener('keydown', listener)
  afterEach(() => document.removeEventListener('keydown', listener))

  // The detail card closes on a document-level Esc. While an edit is open, Esc
  // is the edit's — cancelling one must not also close the panel around it.
  it('cancels the edit without reaching the document', () => {
    const onCancel = vi.fn()
    render(
      <InlineEditableField
        value="Tracker"
        onSave={vi.fn()}
        onCancel={onCancel}
        initialEditMode
      />,
    )

    fireEvent.keyDown(screen.getByDisplayValue('Tracker'), { key: 'Escape' })

    expect(onCancel).toHaveBeenCalled()
    expect(onDocumentEscape).not.toHaveBeenCalled()
  })
})
