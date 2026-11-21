import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/** One open MCP session: bound to the API key that opened it. */
export type McpSession = { server: Server; transport: StreamableHTTPServerTransport; apiKeyId: string; subscriptions: Set<string>; lastSeenAt: number };
