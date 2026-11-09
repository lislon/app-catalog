import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import type { InstallOptionId } from '@igstack/app-catalog-shared-core'
import {
  cliCommand,
  cursorLink,
  installPrompt,
  jsonConfig,
  resolveUrl,
  vscodeLink,
} from '@igstack/app-catalog-shared-core'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { externalLink } from '~/lib/externalLink'
import { useAppCatalogContext } from '../../appCatalog/context/AppCatalogContext'
import { useMcpCatalogConfig } from '../useMcpCatalogConfig'

export interface InstallOption {
  id: InstallOptionId
  label: string
  hint: string
  Icon: () => React.ReactNode
  /** Copies text rather than installing: the menu's "Text only" group. */
  text?: boolean
  /** In code, not on screen: its link is unverified. */
  hidden?: boolean
}

const ICON = 'size-[22px] shrink-0'

function claudeIcon(fill: string, stroke = '#fff') {
  return function ClaudeIcon() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON}>
        <rect width="24" height="24" rx="6" fill={fill} />
        <g stroke={stroke} strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14M7.1 7.1l9.8 9.8M16.9 7.1l-9.8 9.8" />
        </g>
      </svg>
    )
  }
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON}>
      <rect width="24" height="24" rx="6" fill="#14120b" />
      <g fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M12 4.5 18.5 8.2v7.6L12 19.5l-6.5-3.7V8.2Z" />
        <path d="M5.5 8.2 12 12l6.5-3.8M12 12v7.5" />
      </g>
    </svg>
  )
}

function GeminiIcon() {
  // One gradient per icon: an id shared by two icons breaks when one unmounts.
  const id = useId()
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4796e3" />
          <stop offset="1" stopColor="#9168c0" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="#eef2fb" />
      <path
        d="M12 3.5c.5 4.5 4 8 8.5 8.5-4.5.5-8 4-8.5 8.5-.5-4.5-4-8-8.5-8.5 4.5-.5 8-4 8.5-8.5Z"
        fill={`url(#${id})`}
      />
    </svg>
  )
}

/** A lucide glyph on a muted tile; themed, so it reads in light and dark. */
function textIcon(d: string) {
  return function TextIcon() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={ICON}>
        <rect width="24" height="24" rx="6" fill="var(--muted)" />
        <g
          transform="translate(5 5) scale(.58)"
          fill="none"
          stroke="var(--secondary-foreground)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={d} />
        </g>
      </svg>
    )
  }
}

export const INSTALL_OPTIONS: readonly InstallOption[] = [
  {
    id: 'claude-vscode',
    label: 'Claude Code in VS Code',
    hint: 'Opens Claude Code with the install prompt',
    Icon: claudeIcon('#0065a9'),
  },
  {
    id: 'claude-code',
    label: 'Claude Code in terminal',
    hint: 'Copies a claude mcp add command',
    Icon: claudeIcon('#1f1e1d', '#d97757'),
  },
  {
    id: 'claude-desktop',
    label: 'Claude Code desktop',
    hint: 'Opens a claude:// link with the prompt',
    Icon: claudeIcon('#d97757'),
    hidden: true,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    hint: 'Opens Cursor’s install dialog',
    Icon: CursorIcon,
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    hint: 'Copies a terminal command',
    Icon: GeminiIcon,
  },
  {
    id: 'prompt',
    label: 'Copy prompt',
    hint: 'Paste into any AI chat',
    Icon: textIcon(
      'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    ),
    text: true,
  },
  {
    id: 'json',
    label: 'Copy JSON config',
    hint: 'For any client’s mcpServers file',
    Icon: textIcon(
      'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1',
    ),
    text: true,
  },
]

/** The options a person can pick: everything not hidden. */
export const VISIBLE_INSTALL_OPTIONS = INSTALL_OPTIONS.filter((o) => !o.hidden)

/**
 * Copies text, falling back to a hidden textarea where the API is refused.
 * Resolves false when both fail; never rejects.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    try {
      area.select()
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      area.remove()
    }
  }
}

export type CopyFlash = 'copied' | 'copy-failed' | null

/** A copy's outcome, shown for a moment and then cleared. */
export function useCopyFlash() {
  const [flash, setFlash] = useState<CopyFlash>(null)
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1600)
    return () => clearTimeout(t)
  }, [flash])
  return [flash, setFlash] as const
}

/**
 * Everything an install needs for `servers`: their URLs resolved against this
 * host, the prompt for an option, and `run`, which carries the option out and
 * says whether it copied (the caller shows "Copied"), failed to copy, or
 * opened another app.
 */
export function useInstall(servers: readonly CatalogMcpServer[]) {
  const { resources } = useAppCatalogContext()
  const sensitiveDataLabel =
    useMcpCatalogConfig()?.sensitiveDataLabel ?? 'Sensitive data'

  const origin = window.location.origin
  const resolved = useMemo(
    () => servers.map((s) => resolveUrl(s, origin)),
    [servers, origin],
  )
  const apps = useMemo(
    () =>
      [...new Set(servers.flatMap((s) => s.requiredAppSlugs ?? []))].flatMap(
        (slug) => {
          const app = resources.find((r) => r.slug === slug)
          return app
            ? [{ slug, name: app.displayName, url: `${origin}/app/${slug}` }]
            : []
        },
      ),
    [servers, resources, origin],
  )

  const prompt = useCallback(
    (option?: InstallOptionId) =>
      installPrompt(resolved, {
        option,
        apps,
        // This deployment serves the catalog's own MCP endpoint.
        catalogMcpAvailable: true,
        sensitiveDataLabel,
      }),
    [resolved, apps, sensitiveDataLabel],
  )

  const run = useCallback(
    async (
      option: InstallOptionId,
    ): Promise<'copied' | 'copy-failed' | 'opened'> => {
      const open = (url: string) => {
        externalLink.open(url)
        return 'opened' as const
      }
      const copy = async (text: string) =>
        (await copyText(text)) ? ('copied' as const) : ('copy-failed' as const)
      switch (option) {
        case 'claude-vscode':
          return open(vscodeLink(prompt(option)))
        case 'claude-desktop':
          // ponytail: unverified scheme, hidden from the menu until confirmed.
          return open(
            `claude://claude.ai/new?q=${encodeURIComponent(prompt(option))}`,
          )
        case 'cursor':
          // A Cursor link takes one server; several go in as config.
          return resolved.length === 1
            ? open(cursorLink(resolved[0]!))
            : copy(jsonConfig(resolved))
        case 'claude-code':
        case 'gemini':
          return copy(cliCommand(option, resolved))
        case 'prompt':
          return copy(prompt(option))
        case 'json':
          return copy(jsonConfig(resolved))
      }
    },
    [resolved, prompt],
  )

  return { resolved, apps, prompt, run, sensitiveDataLabel }
}
