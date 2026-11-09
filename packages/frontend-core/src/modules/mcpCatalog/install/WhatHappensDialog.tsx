import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import {
  INSTALL_CONFIG_FILE,
  whatHappensSteps,
} from '@igstack/app-catalog-shared-core'
import { Braces, Check, Copy, ExternalLink, KeyRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDismissable } from '~/modules/dismiss/DismissStack'
import { Button } from '~/ui/button'
import { InstallButton } from './InstallButton'
import { VISIBLE_INSTALL_OPTIONS, copyText, useInstall } from './installOptions'
import { useMcpPrefs } from './useMcpPrefs'

const CHIP =
  'inline-flex items-center gap-[5px] rounded-full border border-border bg-card px-[9px] py-0.5 font-semibold [&_svg]:size-[13px]'

/**
 * Plain steps for what installing `servers` does with the chosen AI, what it
 * touches on your machine, and the full prompt. Picking an AI here is the
 * same remembered choice the Install menu makes.
 */
export function WhatHappensDialog({
  servers,
  onClose,
}: {
  servers: readonly CatalogMcpServer[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismissable(ref, onClose)
  const { installWith, setInstallWith } = useMcpPrefs()
  const { resolved, apps, prompt, sensitiveDataLabel } = useInstall(servers)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const option = VISIBLE_INSTALL_OPTIONS.find((o) => o.id === installWith)?.id
  const steps = whatHappensSteps(resolved, option, { apps, sensitiveDataLabel })
  const fullPrompt = prompt(option)
  const tokens = resolved.filter((s) => s.auth.kind === 'token').length
  const hosts = [
    ...new Set(
      resolved.map((s) =>
        s.transport.type === 'http'
          ? new URL(s.transport.url).host
          : 'runs on your computer',
      ),
    ),
  ]
  const title = `What happens when you install ${
    servers.length === 1 ? servers[0]!.displayName : `${servers.length} servers`
  }`

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[2px]"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative my-auto w-full max-w-[560px] rounded-[var(--radius)] border border-border bg-background px-6 py-5 text-foreground shadow-2xl outline-none"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <h2 className="m-0 mb-1 pr-8 font-serif text-[22px] font-semibold">
          {title}
        </h2>
        <p className="m-0 text-muted-foreground">Install with:</p>
        <div className="mt-3.5 mb-1 flex flex-wrap gap-1.5">
          {VISIBLE_INSTALL_OPTIONS.map((o, i) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={o.id === option}
              // The popup takes the caret: the picked AI, else the first.
              autoFocus={option ? o.id === option : i === 0}
              onClick={() => void setInstallWith(o.id)}
              className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-border bg-card py-[3px] pr-2.5 pl-1 text-[12.5px] font-bold aria-pressed:border-primary aria-pressed:bg-accent [&_svg]:size-5"
            >
              <o.Icon />
              {o.label}
            </button>
          ))}
        </div>
        <ol
          data-testid="mcp-what-steps"
          className="m-0 mt-4 grid list-none gap-0.5 p-0 [counter-reset:w]"
        >
          {steps.map((step) => (
            <li
              key={step.title}
              className="grid grid-cols-[28px_1fr] gap-2.5 border-t border-border py-2 text-[13.5px] [counter-increment:w] first:border-t-0 before:grid before:size-6 before:place-items-center before:rounded-full before:bg-secondary before:text-xs before:font-extrabold before:text-secondary-foreground before:content-[counter(w)]"
            >
              <div>
                <b className="block">{step.title}</b>
                <span className="text-[12.5px] text-muted-foreground">
                  {step.detail}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3.5 flex flex-wrap gap-1.5 rounded-[calc(var(--radius)-2px)] bg-muted px-3 py-2.5 text-[12.5px]">
          <b className="w-full text-[11.5px] tracking-[.05em] text-muted-foreground uppercase">
            Touches on your machine
          </b>
          <div data-testid="mcp-what-touches" className="contents">
            <span className={CHIP}>
              <Braces aria-hidden="true" />
              {option ? INSTALL_CONFIG_FILE[option] : 'your AI’s settings'}
            </span>
            {tokens > 0 && (
              <span className={CHIP}>
                <KeyRound aria-hidden="true" />
                {tokens} token{tokens > 1 ? 's' : ''} you create
              </span>
            )}
            {hosts.map((h) => (
              <span key={h} className={CHIP}>
                <ExternalLink aria-hidden="true" />
                {h}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <InstallButton servers={servers} />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void copyText(fullPrompt).then(() => setCopied(true))
            }
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy full prompt'}
          </Button>
        </div>
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[13px] font-bold text-secondary-foreground">
            Show the full prompt
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {fullPrompt}
          </pre>
        </details>
      </div>
    </div>,
    document.body,
  )
}
