import { generateText, stepCountIs } from 'ai'
import type { Tool } from 'ai'
import { createMCPClient } from '@ai-sdk/mcp'
import type {
  AcDatabaseConfig,
  AcLighthouseKeeperConfig,
} from '../../middleware/types.js'
import { APP_CATALOG_AI_SYSTEM_PROMPT, createAppCatalogAITools } from './tools'

export async function runLighthouseKeeperDemo(
  config: AcLighthouseKeeperConfig,
  database: AcDatabaseConfig,
  prompt: string = 'teleport. looks if information is still actual based on sources',
): Promise<string> {
  console.log(`Prompt: ${prompt}\n`)

  const systemPrompt = config.systemPrompt ?? APP_CATALOG_AI_SYSTEM_PROMPT

  const mcpClients: Array<{
    client: { close: () => Promise<void> }
    name: string
  }> = []

  try {
    const allTools: Record<string, Tool> = {
      ...createAppCatalogAITools(database),
    }

    for (const server of config.mcpServers) {
      try {
        const client = await createMCPClient({
          transport: {
            type: 'http',
            url: server.url,
            headers: server.headers,
          },
        })

        mcpClients.push({ client, name: server.name })

        const mcpTools = await client.tools()
        const toolCount = Object.keys(mcpTools).length

        // Merge MCP tools into allTools
        Object.assign(allTools, mcpTools)

        console.log(
          `[MCP] Loaded ${toolCount} tools from ${server.name} (${server.url})`,
        )
      } catch (error) {
        console.error(
          `[MCP] Failed to load tools from ${server.name}:`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }

    console.log(
      `[Tools] Total ${Object.keys(allTools).length} tools available\n`,
    )

    // Run agentic loop with step limit to ensure completion
    const result = await generateText({
      model: config.model,
      system: systemPrompt,
      prompt,
      tools: allTools,
      stopWhen: stepCountIs(10), // Allow up to 10 steps for tool calls + final response
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        if (text) console.log(`[Reasoning] ${text}`)
        toolCalls.forEach((call: any, i: number) => {
          console.log(
            `[Tool Call] ${call.toolName}(${JSON.stringify(call.args)})`,
          )
          // Debug: log the full toolResult structure
          console.log(
            '[Tool Result Full]:',
            JSON.stringify((toolResults as any)[i], null, 2),
          )

          const toolResult = (toolResults as any)[i]?.result
          const resultStr =
            typeof toolResult === 'object'
              ? JSON.stringify(toolResult, null, 2)
              : String(toolResult)
          // Truncate long results for console output
          const truncated =
            resultStr.length > 500
              ? `${resultStr.slice(0, 500)}... [truncated]`
              : resultStr
          console.log(`[Tool Result] ${truncated}`)
        })
      },
    })

    console.log('\n✅ Lighthouse Keeper Demo Complete\n')
    console.log('[Final Result]:', {
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
    })
    return result.text
  } catch (error) {
    console.error('❌ Lighthouse Keeper Error:', error)
    throw error
  } finally {
    // Always clean up MCP clients, even if an error occurs
    await Promise.all(
      mcpClients.map(({ client }) =>
        client.close().catch((err: Error) => {
          console.error('Failed to close MCP client:', err)
        }),
      ),
    )
  }
}
