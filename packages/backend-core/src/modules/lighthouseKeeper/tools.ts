import type { Tool } from 'ai'
import { z } from 'zod'
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import type { AcDatabaseConfig } from '../../middleware/types.js'

// ============================================================================
// Database URL Helper
// ============================================================================

function getDatabaseUrl(config: AcDatabaseConfig): string {
  if ('url' in config) return config.url
  const { host, port, database, username, password, schema } = config
  const schemaParam = schema ? `?schema=${schema}` : ''
  return `postgresql://${username}:${password}@${host}:${port}/${database}${schemaParam}`
}

// ============================================================================
// AI Tools for App Catalog
// ============================================================================

/**
 * Create AI tools for working with app catalog cards.
 * These tools allow the AI to fetch and inspect app information.
 */
export function createAppCatalogAITools(
  databaseConfig: AcDatabaseConfig,
): Record<string, Tool> {
  const databaseUrl = getDatabaseUrl(databaseConfig)
  const pool = new pg.Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const getAppCardSchema = z.object({
    slug: z.string().describe('The app slug to fetch'),
  })

  type GetAppCardInput = z.infer<typeof getAppCardSchema>

  const getAppCard: Tool<GetAppCardInput, unknown> = {
    description:
      'Fetch complete app catalog card information by ID. Returns title, description, tags, access request details, links, and all other app metadata.',
    inputSchema: getAppCardSchema,
    execute: async ({ slug }: { slug: string }) => {
      try {
        const app = await prisma.dbAppForCatalog.findUnique({
          where: { slug },
          include: {
            sourceRefs: true,
          },
        })

        if (!app) {
          return { error: `App not found with slug: ${slug}` }
        }

        // Return structured card data
        return {
          success: true,
          card: {
            id: app.id,
            slug: app.slug,
            displayName: app.displayName,
            description: app.description,
            teams: app.teams,
            tags: app.tags,
            appUrl: app.appUrl,
            links: app.links,
            iconName: app.iconName,
            sources: app.sourceRefs.map((ref) => ref.url),
            notes: app.notes,
            accessRequest: app.accessRequest,
            deprecated: app.deprecated,
            createdAt: app.createdAt,
            updatedAt: app.updatedAt,
          },
        }
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to fetch app',
        }
      }
    },
  }

  return {
    getAppCard,
  }
}

// ============================================================================
// System Prompt
// ============================================================================

/**
 * Default system prompt for AI working with app catalog cards.
 * Use this when configuring lighthouseKeeper for card updates.
 */
export const APP_CATALOG_AI_SYSTEM_PROMPT = `You are an assistant that helps update app catalog cards based on information from provided links.

When given a link and an app ID:
1. Use getAppCard to fetch the current card information
2. Analyze the provided link for relevant information
3. Output a new card structure with updated information based on the link

Return the updated card as a structured JSON object matching the card format:
- displayName: App title
- description: Full description
- tags: Array of tags
- teams: Array of team names
- appUrl: Main application URL
- links: Array of {url, title} objects for related links
- sources: Array of source URLs (documentation, Confluence pages, etc.)
- accessRequest: Object with approvalMethodSlug, comments, requestPrompt, postApprovalInstructions, roles, approverPersonSlugs, urls
- notes: Additional notes
- deprecated: Optional deprecation info with type, replacementSlug, comment

Do NOT save the card to the database. Only output the updated structure.`
