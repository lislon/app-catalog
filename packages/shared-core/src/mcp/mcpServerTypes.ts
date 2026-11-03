/**
 * MCP server catalog types.
 * OSS generic — never contains company-specific values.
 */

export type McpServer = {
  slug: string // also the config entry name: claude mcp add <slug>
  displayName: string
  description: string // "what your AI can do with it": the headline of every card
  category: string // groups the list; order and titles come from company config
  aliases?: string[] // search terms ("jira", "ticket")
  status: 'production' | 'beta' | 'personal'
  access: 'read' | 'write'
  writeNote?: string // what exactly it can change
  sensitiveData?: boolean // whether it touches company-configured sensitive data
  requiredAppSlugs?: string[] // apps in this catalog you need an account in; must resolve to DbResource
  auth: {
    kind: 'sso' | 'token' | 'none'
    note?: string
    token?: { page: string; steps: string[] }
  }
  transport:
    | { type: 'http'; url: string; headers?: Record<string, string> } // url may be relative; header values are placeholders like <GITLAB_API_TOKEN>, never secrets
    | { type: 'stdio'; command: string; args: string[] }
  tools: { name: string; description: string }[]
  ownerSlug?: string // → PersonOrGroup, same resolution as Resource.owner / approverSlugs
  support?: { label: string; url: string } // e.g. a chat channel
  sources: string[] // URLs actually read to write this entry (README, docs, thread); at least one
}

export type McpCatalogConfig = {
  categories?: { key: string; title: string; blurb?: string }[]
  intents?: { query: string; title: string; caption: string; icon: string }[]
  tryQueries?: string[]
  sensitiveDataLabel?: string
  installIconUrl?: string
}
