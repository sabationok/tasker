import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiKeyEntity } from '../api-keys/entities/api-key.entity';
import { AppException } from '../common/http/app-exception';
import { McpSessionsService } from './services/mcp-sessions';

type McpRequest = Request & { apiKey?: ApiKeyEntity };

/**
 * `/mcp` — MCP streamable HTTP (POST messages, GET the session stream, DELETE ends it). The global `ApiKeyGuard` has
 * already checked the bearer key; a session only answers the key that opened it.
 */
@Controller('mcp')
export class McpController {
  constructor(private readonly _sessions: McpSessionsService) {}

  @All()
  async handle(@Req() req: McpRequest, @Res() res: Response): Promise<void> {
    const apiKeyId = req.apiKey?.id;
    if (!apiKeyId) throw AppException.unauthorized();
    const sessionId = req.headers['mcp-session-id'];
    let session = typeof sessionId === 'string' ? this._sessions.find(sessionId) : undefined;
    if (session && session.apiKeyId !== apiKeyId) throw AppException.unauthorized();
    if (!session) {
      if (req.method !== 'POST' || sessionId) {
        res.status(404).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Session not found' }, id: null });
        return;
      }
      session = await this._sessions.open(apiKeyId);
    }
    await session.transport.handleRequest(req, res, req.body);
  }
}
