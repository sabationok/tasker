import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { Ctx, type RequestCtx } from '../common/context/request-context';
import { AppException } from '../common/http/app-exception';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { DraftsService } from '../drafts/drafts.service';
import { ToolsRegistry } from './tools.registry';

const draftBody = z.object({ draftId: z.string().uuid() }).strict();
const batchBody = z.object({ batchId: z.string().uuid() }).strict();

/** `/drafts/*` — the mini app's review screen: list a batch, save / discard one or all. */
@Controller('drafts')
export class DraftsController {
  constructor(
    private readonly _drafts: DraftsService,
    private readonly _tools: ToolsRegistry,
  ) {}

  @Get('many')
  async findMany(@Query(new ZodPipe(batchBody)) q: { batchId: string }) {
    return AppResponse.ok({ items: await this._drafts.findByBatch(q.batchId) });
  }

  @Post('save')
  async save(@Body(new ZodPipe(draftBody)) dto: { draftId: string }, @Ctx() ctx: RequestCtx) {
    const res = await this._tools.saveDraft(dto.draftId, ctx);
    if (!res.ok) throw AppException.invalid(res.errors);
    return AppResponse.ok(res.structured);
  }

  @Post('discard')
  async discard(@Body(new ZodPipe(draftBody)) dto: { draftId: string }) {
    return AppResponse.ok(await this._drafts.discard(dto.draftId));
  }

  @Post('save-batch')
  async saveBatch(@Body(new ZodPipe(batchBody)) dto: { batchId: string }, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok({ results: await this._tools.saveBatch(dto.batchId, ctx) });
  }
}
