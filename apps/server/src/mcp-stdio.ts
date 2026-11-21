import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ResourceUpdatedNotificationSchema,
  SubscribeRequestSchema,
  ToolListChangedNotificationSchema,
  UnsubscribeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * stdio entry for Claude Code: a proxy (no DB) to the running tasker server's `/mcp`, with the key from
 * `TASKER_API_KEY` (env only, no .env: it runs in the caller's folder). `TASKER_URL` overrides `http://127.0.0.1:$PORT/mcp`.
 */
async function main(): Promise<void> {
  const key = process.env.TASKER_API_KEY;
  if (!key) throw new Error('TASKER_API_KEY is not set');
  const url = new URL(process.env.TASKER_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3109}/mcp`);

  const upstream = new Client({ name: 'tasker-stdio', version: '0.1.0' });
  await upstream.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${key}` } } }));
  const info = upstream.getServerVersion();

  const server = new Server({ name: info?.name ?? 'tasker', version: info?.version ?? '0.0.0' }, { capabilities: { tools: { listChanged: true }, resources: { subscribe: true } } });
  server.setRequestHandler(ListToolsRequestSchema, (req) => upstream.listTools(req.params));
  server.setRequestHandler(CallToolRequestSchema, (req) => upstream.callTool(req.params) as never);
  server.setRequestHandler(ListResourcesRequestSchema, (req) => upstream.listResources(req.params));
  server.setRequestHandler(ListResourceTemplatesRequestSchema, (req) => upstream.listResourceTemplates(req.params));
  server.setRequestHandler(ReadResourceRequestSchema, (req) => upstream.readResource(req.params));
  server.setRequestHandler(SubscribeRequestSchema, (req) => upstream.subscribeResource(req.params));
  server.setRequestHandler(UnsubscribeRequestSchema, (req) => upstream.unsubscribeResource(req.params));
  upstream.setNotificationHandler(ToolListChangedNotificationSchema, () => server.sendToolListChanged());
  upstream.setNotificationHandler(ResourceUpdatedNotificationSchema, (n) => server.sendResourceUpdated(n.params));

  await server.connect(new StdioServerTransport());
  server.onclose = () => void upstream.close().then(() => process.exit(0));
}

main().catch((e: Error) => {
  console.error(`[tasker-stdio] ${e.message}`);
  process.exit(1);
});
