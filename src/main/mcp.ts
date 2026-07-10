import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport, type StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { z } from 'zod'
import { restrictedChildEnvironment } from '../shared/safety'

export const ConnectorSchema = z.discriminatedUnion('transport', [
  z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    name: z.string().trim().min(1).max(120),
    transport: z.literal('http'),
    url: z.string().url().max(2_048).refine((value) => {
      const url = new URL(value)
      return url.protocol === 'https:' && !url.username && !url.password && !url.hash
    }, 'Remote MCP connections require HTTPS and may not contain credentials or fragments.'),
    token: z.string().trim().min(8).max(8_192).optional()
  }).strict(),
  z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    name: z.string().trim().min(1).max(120),
    transport: z.literal('stdio'),
    command: z.enum(['npx', 'node', 'uvx', 'python3']),
    args: z.array(z.string().max(2_048).refine((value) => !value.includes('\0'), 'Arguments may not contain null bytes.')).max(32).default([])
  }).strict()
])
export type Connector = z.infer<typeof ConnectorSchema>

const clients = new Map<string, Client>()

export async function connectMcp(input: unknown): Promise<Array<{ name: string; description?: string }>> {
  const connector = ConnectorSchema.parse(input)
  await disconnectMcp(connector.id)
  const client = new Client({ name: 'nexus', version: '0.1.0' })
  if (connector.transport === 'http') {
    const headers = connector.token ? { Authorization: `Bearer ${connector.token}` } : undefined
    await client.connect(new StreamableHTTPClientTransport(new URL(connector.url), { requestInit: { headers } }))
  } else {
    const parameters: StdioServerParameters = {
      command: connector.command,
      args: connector.args,
      env: restrictedChildEnvironment(process.env)
    }
    await client.connect(new StdioClientTransport(parameters))
  }
  clients.set(connector.id, client)
  const result = await client.listTools()
  return result.tools.map(({ name, description }) => ({ name, description }))
}

export async function callMcpTool(connectorId: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  const client = clients.get(connectorId)
  if (!client) throw new Error('Connector is not connected.')
  return client.callTool({ name, arguments: args })
}

export async function disconnectMcp(id: string): Promise<void> {
  const client = clients.get(id)
  if (client) await client.close()
  clients.delete(id)
}

export async function disconnectAllMcp(): Promise<void> {
  await Promise.all([...clients.keys()].map(disconnectMcp))
}
