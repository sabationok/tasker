import { Injectable, type OnModuleInit } from '@nestjs/common';
import { DraftsEvents } from '../../../drafts/drafts.events';
import { MCP_RESOURCE_URIS } from '../../constants/context-text';
import { McpSessionsService } from './mcp-sessions.service';

/** Draft status changes → `resources/updated` for `tasker://drafts/<batchId>` on the draft key's sessions. */
@Injectable()
export class McpSessionsListener implements OnModuleInit {
  constructor(
    private readonly _events: DraftsEvents,
    private readonly _sessions: McpSessionsService,
  ) {}

  onModuleInit(): void {
    this._events.subscribe(async (change) => {
      await this._sessions.notifyResourceUpdated(change.apiKeyId, `${MCP_RESOURCE_URIS.draftsPrefix}${change.batchId}`);
    });
  }
}
