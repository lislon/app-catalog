/**
 * Minimal MCP client for the docs page: one `tools/list` call over Streamable
 * HTTP. Deliberately raw `fetch` rather than the MCP SDK — the page needs one
 * unauthenticated read and nothing else.
 *
 * The endpoint is stateless (a fresh server per request), so `tools/list`
 * stands alone with no `initialize` handshake. It may answer with either JSON
 * or a single SSE event, so both are parsed.
 */

export interface McpToolParameter {
  name: string
  type?: string
  required: boolean
  description?: string
  enumValues?: string[]
}

export interface McpTool {
  name: string
  title?: string
  description?: string
  parameters: McpToolParameter[]
}

/** Path the MCP server is mounted at, relative to the site origin. */
export const MCP_ENDPOINT_PATH = '/api/mcp'

interface JsonSchemaProperty {
  type?: string | string[]
  description?: string
  enum?: unknown[]
  items?: { type?: string | string[]; enum?: unknown[] }
}

function describeType(prop: JsonSchemaProperty): string | undefined {
  const base = Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type
  if (base === 'array') {
    const itemType = Array.isArray(prop.items?.type)
      ? prop.items.type.join(' | ')
      : prop.items?.type
    return itemType ? `${itemType}[]` : 'array'
  }
  return base
}

function enumValues(prop: JsonSchemaProperty): string[] | undefined {
  const values = prop.enum ?? prop.items?.enum
  return values?.length ? values.map(String) : undefined
}

/** Pull the single JSON-RPC payload out of a JSON or SSE response body. */
function parseBody(contentType: string, body: string): unknown {
  if (!contentType.includes('text/event-stream')) {
    return JSON.parse(body)
  }
  const dataLines = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
  if (dataLines.length === 0) {
    throw new Error('The server returned an empty event stream.')
  }
  return JSON.parse(dataLines.join(''))
}

/**
 * Fetch the live tool registry so this page cannot go stale when the tools
 * change.
 *
 * @param origin - Site origin, e.g. `window.location.origin`
 * @param signal - Optional abort signal
 */
export async function fetchMcpTools(
  origin: string,
  signal?: AbortSignal,
): Promise<McpTool[]> {
  const response = await fetch(`${origin}${MCP_ENDPOINT_PATH}`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      // The Streamable HTTP transport requires the client to accept both.
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  })

  if (!response.ok) {
    throw new Error(
      `The MCP endpoint answered ${response.status} ${response.statusText}.`,
    )
  }

  const payload = parseBody(
    response.headers.get('content-type') ?? '',
    await response.text(),
  ) as {
    error?: { message?: string }
    result?: {
      tools?: {
        name: string
        title?: string
        description?: string
        inputSchema?: {
          properties?: Record<string, JsonSchemaProperty>
          required?: string[]
        }
      }[]
    }
  }

  if (payload.error) {
    throw new Error(
      payload.error.message ?? 'The MCP endpoint returned an error.',
    )
  }

  return (payload.result?.tools ?? []).map((tool) => {
    const properties = tool.inputSchema?.properties ?? {}
    const required = new Set(tool.inputSchema?.required ?? [])
    return {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      parameters: Object.entries(properties).map(([name, prop]) => ({
        name,
        type: describeType(prop),
        required: required.has(name),
        description: prop.description,
        enumValues: enumValues(prop),
      })),
    }
  })
}
