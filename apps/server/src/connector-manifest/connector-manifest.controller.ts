import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../api-keys/decorators/public.decorator';
import { env } from '../config/env';
import { MCP_CONTEXT_TEXT, MCP_RESOURCE_URIS } from '../mcp/constants/context-text';
import { SERVER_VERSION } from '../mcp/constants/server-version';
import { TOOL_MODULES } from '../tools/constants/tool-modules';
import { CONNECTOR_ICON_SVG } from './constants/connector-icon';

/** Connector manifest (connector-protocol §9): what a hub needs to register tasker and open its mini app. Public. */
@Controller('.well-known')
export class ConnectorManifestController {
  @Public()
  @Get('connector.json')
  manifest() {
    const origin = `http://${env.BIND_HOST}:${env.PORT}`;
    const icon = { url: `${origin}/.well-known/connector-icon.svg`, mimeType: 'image/svg+xml' };
    return {
      protocol: 'connector-protocol/0.1',
      slug: 'tasker',
      name: 'Tasker',
      description: 'Задачі, періодичні справи, звички, ідеї та нотатки; проєкти й категорії; статистика.',
      version: SERVER_VERSION,
      /** The deployment's stage: a hub of one stage registers only connectors of the same stage. */
      stage: env.STAGE,
      locales: ['uk', 'en'],
      icon,
      color: '#1F3A5F',
      routing: { context: MCP_CONTEXT_TEXT, modules: Object.entries(TOOL_MODULES).map(([id, description]) => ({ id, description })) },
      mcp: {
        url: `${origin}/mcp`,
        transport: 'streamable-http',
        auth: { type: 'bearer', ...(env.TRUST_CLIENT_HEADER && { devHeader: 'X-Tasker-Client' }) },
        resources: { context: MCP_RESOURCE_URIS.context, today: MCP_RESOURCE_URIS.today, drafts: `${MCP_RESOURCE_URIS.draftsPrefix}{batchId}` },
      },
      app: {
        url: env.MINI_APP_URL,
        title: 'Tasker',
        icon,
        launch: { initData: 'fragment', sessionUrl: `${env.MINI_APP_URL.replace(/\/$/, '')}/session` },
        pageAgent: true,
        viewport: { minWidth: 360, preferredWidth: 420 },
      },
      events: { types: ['draft.updated', 'reminder.due'], signature: 'X-Connector-Signature' },
    };
  }

  @Public()
  @Get('connector-icon.svg')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'public, max-age=86400')
  icon(): string {
    return CONNECTOR_ICON_SVG;
  }
}
