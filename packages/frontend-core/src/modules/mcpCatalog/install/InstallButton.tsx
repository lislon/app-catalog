import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import type { InstallOptionId } from '@igstack/app-catalog-shared-core'
import { Check, ChevronDown, Sparkles, TriangleAlert } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { cn } from '~/lib/utils'
import { useMcpCatalogConfig } from '../useMcpCatalogConfig'
import { InstallMenu } from './InstallMenu'
import { INSTALL_OPTIONS, useCopyFlash, useInstall } from './installOptions'
import { useMcpPrefs } from './useMcpPrefs'

const HALF =
  'inline-flex min-h-8 items-center gap-1.5 border-0 bg-transparent text-[13px] font-bold'

/**
 * Split button: the main half installs with the remembered option (or, before
 * any choice, opens the menu); the caret always opens the menu. A copy shows
 * "Copied" (or "Copy failed") on the main half for a moment. While the
 * remembered choice is still loading it is a blank, disabled placeholder.
 */
export function InstallButton({
  servers,
  tone = 'light',
}: {
  servers: readonly CatalogMcpServer[]
  /** `dark` for a dark bar, such as the cart's. */
  tone?: 'light' | 'dark'
}) {
  const { loading, installWith, setInstallWith } = useMcpPrefs()
  const { run } = useInstall(servers)
  const iconUrl = useMcpCatalogConfig()?.installIconUrl
  const splitRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [flash, setFlash] = useCopyFlash()

  const chosen = INSTALL_OPTIONS.find((o) => o.id === installWith && !o.hidden)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const go = async (id: InstallOptionId) => {
    const outcome = await run(id)
    if (outcome !== 'opened') setFlash(outcome)
  }
  const pick = async (id: InstallOptionId) => {
    setMenuOpen(false)
    // Copy first: the clipboard wants the click's user activation. The pick
    // is stored whatever the copy did.
    await go(id)
    await setInstallWith(id)
  }

  const hover = tone === 'dark' ? 'hover:bg-white/15' : 'hover:bg-muted'

  const firstVisit = (
    <>
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="-my-[3px] size-[22px] object-contain"
        />
      ) : (
        <Sparkles aria-hidden="true" className="size-4 text-primary" />
      )}
      Let me do it for you
    </>
  )

  return (
    <div
      ref={splitRef}
      data-testid="mcp-install"
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-[calc(var(--radius)-4px)] border',
        tone === 'dark'
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-border bg-card text-foreground',
      )}
    >
      <button
        type="button"
        disabled={loading}
        data-icon={
          loading
            ? 'loading'
            : (flash ?? chosen?.id ?? (iconUrl ? 'custom' : 'default'))
        }
        title={
          chosen
            ? `Install with ${chosen.label}`
            : 'Pick your AI once and it installs this for you'
        }
        onClick={() => (chosen ? void go(chosen.id) : setMenuOpen((o) => !o))}
        className={cn(
          HALF,
          hover,
          'pr-2.5 pl-2 disabled:hover:bg-transparent',
          flash === 'copied' && 'text-green-700 dark:text-green-400',
          flash === 'copy-failed' && 'text-destructive',
        )}
      >
        {loading ? (
          // Holds the first-visit width without claiming either state.
          <span
            aria-hidden="true"
            className="invisible inline-flex items-center gap-1.5"
          >
            {firstVisit}
          </span>
        ) : flash === 'copied' ? (
          <>
            <Check aria-hidden="true" className="size-4" />
            Copied
          </>
        ) : flash === 'copy-failed' ? (
          <>
            <TriangleAlert aria-hidden="true" className="size-4" />
            Copy failed
          </>
        ) : chosen ? (
          <>
            <chosen.Icon />
            Install
          </>
        ) : (
          firstVisit
        )}
      </button>
      <button
        type="button"
        aria-label="Choose how to install"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={loading}
        onClick={() => setMenuOpen((o) => !o)}
        className={cn(
          HALF,
          hover,
          'border-l px-1.5',
          tone === 'dark' ? 'border-white/20' : 'border-border',
        )}
      >
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </button>
      {menuOpen && (
        <InstallMenu
          anchor={splitRef}
          current={chosen?.id}
          onPick={(id) => void pick(id).catch(console.error)}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}
