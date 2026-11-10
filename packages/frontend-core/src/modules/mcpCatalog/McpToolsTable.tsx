import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'

const CELL = 'border-t border-border px-3 py-[7px] align-top'

/** Every tool the server gives your AI, with what it does. */
export function McpToolsTable({ server }: { server: CatalogMcpServer }) {
  return (
    <section>
      <h3 className="mt-0 mb-2 text-xs font-extrabold tracking-[.06em] text-muted-foreground uppercase">
        Tools · {server.tools.length}
      </h3>
      <div className="overflow-hidden rounded-[calc(var(--radius)-2px)] border border-border bg-card">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-muted text-left text-[11.5px] font-extrabold tracking-[.05em] text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-[7px]">Tool</th>
              <th className="px-3 py-[7px]">What it does</th>
            </tr>
          </thead>
          <tbody>
            {server.tools.map((tool) => (
              <tr key={tool.name}>
                <td className={`${CELL} w-[1%] whitespace-nowrap`}>
                  <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                    {tool.name}
                  </code>
                </td>
                <td className={CELL}>{tool.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
