import { Check, Copy, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '~/ui/button'
import { Spinner } from '~/ui/spinner'
import type { McpTool } from '../../utils/fetchMcpTools'
import { MCP_ENDPOINT_PATH, fetchMcpTools } from '../../utils/fetchMcpTools'

/**
 * MCP docs page: how to point an AI agent at this catalog.
 *
 * Every snippet is built from `window.location.origin`, so production, a
 * preview host and localhost each show a config that actually works — nothing
 * is hardcoded.
 *
 * The tool reference is fetched from the live registry (`tools/list`) rather
 * than written out by hand, so it cannot rot when the server's tools change.
 */
export function McpPage() {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const endpoint = `${origin}${MCP_ENDPOINT_PATH}`
  const serverName = 'app-catalog'

  const [tools, setTools] = useState<McpTool[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // New view: land keyboard and screen-reader users in the content rather than
  // leaving focus on whatever nav element was clicked.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setTools(null)
    setError(null)
    fetchMcpTools(origin, controller.signal)
      .then(setTools)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(
          err instanceof Error
            ? err.message
            : 'Could not reach the MCP endpoint.',
        )
      })
    return () => controller.abort()
  }, [origin, reloadKey])

  const mcpJson = JSON.stringify(
    {
      mcpServers: {
        [serverName]: { type: 'http', url: endpoint },
      },
    },
    null,
    2,
  )
  const cliCommand = `claude mcp add --transport http ${serverName} ${endpoint}`

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto pb-8">
        <section className="flex flex-col gap-2">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold outline-none"
          >
            MCP server
          </h1>
          <p className="text-sm text-muted-foreground">
            This catalog exposes a{' '}
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Model Context Protocol
            </a>{' '}
            server, so an AI agent can search the catalog and read an entry the
            same way you can — what exists, who owns it, and how to request
            access. Point your agent at the endpoint below and it gains those
            tools; no key or account is needed.
          </p>
          <p className="text-sm text-muted-foreground">
            It speaks MCP over Streamable HTTP (JSON-RPC over{' '}
            <code className="text-xs">POST</code>), and it is read-only.
          </p>
        </section>

        <Snippet
          title="Endpoint"
          description="The URL an MCP client connects to."
          value={endpoint}
        />

        <Snippet
          title="Add it with the CLI"
          description="One command, if your agent ships a CLI that manages MCP servers."
          value={cliCommand}
        />

        <Snippet
          title="Or add it to .mcp.json"
          description="Commit this in a project so everyone working on it gets the same tools."
          value={mcpJson}
          language="json"
        />

        <section
          className="flex flex-col gap-3"
          aria-busy={tools === null && error === null}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Tools</h2>
            <p className="text-xs text-muted-foreground">
              Read live from the server, so this list is always what your agent
              will actually see.
            </p>
          </div>

          {error !== null ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4"
            >
              <p className="flex items-start gap-2 text-sm">
                <TriangleAlert className="size-4 shrink-0 mt-0.5 text-destructive" />
                <span>
                  Could not read the tool list. {error} The setup instructions
                  above are still correct.
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Try again
              </Button>
            </div>
          ) : tools === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Reading the tool list…
            </p>
          ) : tools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The server reported no tools.
            </p>
          ) : (
            <ul className="flex flex-col gap-4 list-none p-0 m-0">
              {tools.map((tool) => (
                <li
                  key={tool.name}
                  className="rounded-md border p-4 flex flex-col gap-2"
                >
                  <code className="text-sm font-semibold">{tool.name}</code>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  )}
                  {tool.parameters.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No parameters.
                    </p>
                  ) : (
                    <dl className="flex flex-col gap-2 m-0">
                      {tool.parameters.map((param) => (
                        <div key={param.name} className="flex flex-col gap-0.5">
                          <dt className="text-xs">
                            <code className="font-medium">{param.name}</code>
                            {param.type && (
                              <span className="text-muted-foreground">
                                {' '}
                                {param.type}
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              {' '}
                              — {param.required ? 'required' : 'optional'}
                            </span>
                          </dt>
                          {param.description && (
                            <dd className="text-xs text-muted-foreground m-0">
                              {param.description}
                            </dd>
                          )}
                          {param.enumValues && (
                            <dd className="text-xs text-muted-foreground m-0">
                              One of: {param.enumValues.join(', ')}
                            </dd>
                          )}
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Snippet({
  title,
  description,
  value,
  language,
}: {
  title: string
  description: string
  value: string
  language?: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="relative">
        <pre
          className="overflow-x-auto rounded-md border bg-muted/40 p-3 pr-12 text-xs"
          data-language={language}
        >
          <code>{value}</code>
        </pre>
        <CopyButton value={value} label={title} />
      </div>
    </section>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [value])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : 'Copy'}
      className="absolute right-1.5 top-1.5"
    >
      {copied ? (
        <Check className="size-4 text-primary" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  )
}
