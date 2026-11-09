import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import type { InstallOptionId } from '@igstack/app-catalog-shared-core'
import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '~/lib/utils'
import { useMcpCatalogConfig } from '../useMcpCatalogConfig'
import { InstallMenu } from './InstallMenu'
import { INSTALL_OPTIONS, useInstall } from './installOptions'
import { useMcpPrefs } from './useMcpPrefs'

const HALF =
  'inline-flex min-h-8 items-center gap-1.5 border-0 bg-transparent text-[13px] font-bold'

/**
 * Split button: the main half installs with the remembered option (or, before
 * any choice, opens the menu); the caret always opens the menu. A copy shows
 * "Copied" on the main half for a moment.
 */
export function InstallButton({
  servers,
  tone = 'light',
}: {
  servers: readonly CatalogMcpServer[]
  /** `dark` for a dark bar, such as the cart's. */
  tone?: 'light' | 'dark'
}) {
  const { installWith, setInstallWith } = useMcpPrefs()
  const { run } = useInstall(servers)
  const iconUrl = useMcpCatalogConfig()?.installIconUrl
  const splitRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const chosen = INSTALL_OPTIONS.find((o) => o.id === installWith && !o.hidden)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const go = async (id: InstallOptionId) => {
    if ((await run(id)) === 'copied') setCopied(true)
  }
  const pick = async (id: InstallOptionId) => {
    setMenuOpen(false)
    // Copy first: the clipboard wants the click's user activation.
    await go(id)
    await setInstallWith(id)
  }

  const hover = tone === 'dark' ? 'hover:bg-white/15' : 'hover:bg-muted'

  return (
    <div
      ref={splitRef}
      data-testid="mcp-install"
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-[calc(var(--radius)-4px)] border',
        tone === 'dark'
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-border bg-card text-foreground',
      )}
    >
      <button
        type="button"
        data-icon={
          copied ? 'copied' : (chosen?.id ?? (iconUrl ? 'custom' : 'default'))
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
          'pr-2.5 pl-2',
          copied && 'text-green-700 dark:text-green-400',
        )}
      >
        {copied ? (
          <>
            <Check aria-hidden="true" className="size-4" />
            Copied
          </>
        ) : chosen ? (
          <>
            <chosen.Icon />
            Install
          </>
        ) : (
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
        )}
      </button>
      <button
        type="button"
        aria-label="Choose how to install"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
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
          onPick={(id) => void pick(id)}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}
