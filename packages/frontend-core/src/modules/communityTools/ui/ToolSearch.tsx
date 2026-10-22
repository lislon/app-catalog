import { Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const KBD =
  'shrink-0 rounded-[5px] border border-b-2 border-border bg-card px-1.5 py-px text-[11px] font-semibold text-muted-foreground'

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT')
  )
}

/**
 * The community search box. It has focus when the page opens and `/` brings it
 * back from anywhere. Esc clears it; a second Esc, on an empty box, leaves it.
 * The arrow keys and Enter belong to the results, so they go to `onKey`.
 */
export function ToolSearch({
  value,
  onChange,
  resultCount,
  onKey,
  listboxId,
  activeDescendant,
}: {
  value: string
  onChange: (value: string) => void
  resultCount: number
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void
  /** The results listbox, while there are results to move through. */
  listboxId?: string
  /** The selected result's id: the option ↑↓ move and Enter opens. */
  activeDescendant?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const searching = value.trim() !== ''

  useEffect(() => {
    const onSlash = (e: KeyboardEvent) => {
      if (e.key !== '/' || isTypingTarget(e.target)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onSlash)
    return () => document.removeEventListener('keydown', onSlash)
  }, [])

  const clear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div
      data-testid="tool-search"
      className="flex h-[50px] min-w-0 flex-1 items-center gap-[11px] rounded-full border border-border bg-card px-4 text-muted-foreground transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/20"
    >
      <Search aria-hidden="true" className="size-[19px] shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        aria-label="Search community tools"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listboxId !== undefined}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        placeholder="Type anything you remember: a word, the author, part of the address"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            if (value) onChange('')
            else e.currentTarget.blur()
            return
          }
          onKey(e)
        }}
        className="min-w-0 flex-1 truncate border-0 bg-transparent text-[15.5px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      {searching ? (
        <>
          <span className="shrink-0 text-[13px] font-semibold">
            {resultCount === 1 ? '1 tool' : `${resultCount} tools`}
          </span>
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="shrink-0 rounded-full p-1 hover:bg-accent hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
          <kbd className={KBD}>Esc</kbd>
        </>
      ) : (
        <kbd className={KBD}>/</kbd>
      )}
    </div>
  )
}
