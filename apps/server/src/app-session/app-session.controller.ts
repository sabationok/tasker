import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { isLoopback } from '../common/helpers/is-loopback';
import { z } from 'zod';
import { Public } from '../api-keys/decorators/public.decorator';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { APP_SESSION_COOKIE, AppSessionService } from './app-session.service';

const sessionBody = z.object({ initData: z.string().min(10).max(8192) }).strict();

@Controller('assistant/app')
export class AppSessionController {
  constructor(private readonly _sessions: AppSessionService) {}

  /** Exchanges a host's signed `initData` for an httpOnly session cookie scoped to the signing key. */
  @Public()
  @Post('session')
  @HttpCode(200)
  async open(@Body(new ZodPipe(sessionBody)) body: { initData: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, payload, session } = await this._sessions.open(body.initData, isLoopback(req.socket.remoteAddress));
    res.cookie(APP_SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 60 * 1000 });
    return AppResponse.ok({ batchId: session.batchId, draftIds: session.draftIds, locale: payload.locale ?? null, theme: payload.theme ?? null });
  }
}
