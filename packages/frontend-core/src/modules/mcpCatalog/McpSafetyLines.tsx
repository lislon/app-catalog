import type { CatalogMcpServer } from '@igstack/app-catalog-backend-core'
import { Eye, Pencil, TriangleAlert } from 'lucide-react'
import { SIGN_IN } from './signIn'
import { useSensitiveDataLabel } from './useMcpCatalogConfig'

const LINE = 'flex flex-wrap items-baseline gap-x-2'
const ICON = 'size-[15px] shrink-0 self-center'
const NOTE = 'text-[13px] text-muted-foreground'

const SIGN_IN_NOTE: Record<CatalogMcpServer['auth']['kind'], string> = {
  sso: 'A browser window opens to sign you in.',
  token: 'You paste your own token once.',
  none: 'Nothing to set up.',
}

/** One line each: what it can change, sensitive data, how you sign in. */
export function McpSafetyLines({ server }: { server: CatalogMcpServer }) {
  const sensitiveLabel = useSensitiveDataLabel()
  const signIn = SIGN_IN[server.auth.kind]
  const token = server.auth.token

  return (
    <ul className="m-0 grid list-none gap-1 p-0 text-[13.5px]">
      {server.access === 'write' ? (
        <li className={LINE}>
          <Pencil
            aria-hidden="true"
            className={`${ICON} text-orange-600 dark:text-orange-400`}
          />
          <b>Can write</b>
          <span className={NOTE}>
            {server.writeNote ?? 'Some tools change data.'}
          </span>
        </li>
      ) : (
        <li className={LINE}>
          <Eye
            aria-hidden="true"
            className={`${ICON} text-green-600 dark:text-green-400`}
          />
          <b>Read-only</b>
          <span className={NOTE}>looks things up, changes nothing</span>
        </li>
      )}
      {server.sensitiveData && (
        <li className={LINE}>
          <TriangleAlert
            aria-hidden="true"
            className={`${ICON} text-destructive`}
          />
          <b>{sensitiveLabel}</b>
          <span className={NOTE}>your AI can read this data</span>
        </li>
      )}
      <li className={LINE}>
        <signIn.Icon
          aria-hidden="true"
          className={`${ICON} text-muted-foreground`}
        />
        <b>{signIn.badge}</b>
        <span className={NOTE}>
          {server.auth.note ?? SIGN_IN_NOTE[server.auth.kind]}
        </span>
        {token && (
          <details className="ml-[23px] w-full text-[13px]">
            <summary className="cursor-pointer font-bold text-primary">
              How to get the token
            </summary>
            <ol className="mt-1 mb-0 list-decimal pl-[18px] text-muted-foreground">
              {token.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
              <li>
                <a
                  href={token.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline"
                >
                  Open the token page
                </a>
              </li>
            </ol>
          </details>
        )}
      </li>
    </ul>
  )
}
