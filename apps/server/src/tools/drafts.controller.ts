import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { Ctx, type RequestCtx } from '../common/context/request-context';
import { AppException } from '../common/http/app-exception';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { DraftsService } from '../drafts/drafts.service';
import { ToolsRegistry } from './tools.registry';

const draftBody = z.object({ draftId: z.string().uuid() }).strict();
const saveBody = z.object({ draftId: z.string().uuid(), dto: z.record(z.unknown()).optional() }).strict();
const discardBody = z.object({ draftId: z.string().uuid(), reason: z.enum(['wrong_connector', 'wrong_tool', 'wrong_values']).optional() }).strict();
const batchBody = z.object({ batchId: z.string().uuid() }).strict();

/** `/drafts/*` — the mini app's review screen: list a batch, save / discard one or all. */
@Controller('drafts')
export class DraftsController {
  constructor(
    private readonly _drafts: DraftsService,
    private readonly _tools: ToolsRegistry,
  ) {}

  @Get('many')
  async findMany(@Query(new ZodPipe(batchBody)) q: { batchId: string }, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok({ items: await this._drafts.findByBatch(q.batchId, ctx.apiKeyId) });
  }

  @Post('save')
  async save(@Body(new ZodPipe(saveBody)) body: z.infer<typeof saveBody>, @Ctx() ctx: RequestCtx) {
    const res = await this._tools.saveDraft(body.draftId, ctx, undefined, undefined, body.dto);
    if (!res.ok) throw AppException.invalid(res.errors);
    return AppResponse.ok(res.structured);
  }

  @Post('discard')
  async discard(@Body(new ZodPipe(discardBody)) body: z.infer<typeof discardBody>, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._drafts.discard(body.draftId, ctx.apiKeyId, body.reason));
  }

  @Post('save-batch')
  async saveBatch(@Body(new ZodPipe(batchBody)) dto: { batchId: string }, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok({ results: await this._tools.saveBatch(dto.batchId, ctx) });
  }
}
