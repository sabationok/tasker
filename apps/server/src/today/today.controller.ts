import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { Ctx, type RequestCtx } from '../common/context/request-context';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { TodayService } from './services/today';

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const todayQuery = z.object({ date: localDate.optional(), categoryId: z.string().uuid().optional() }).strict();
const stripQuery = z.object({ from: localDate, to: localDate }).strict();

@Controller('today')
export class TodayController {
  constructor(private readonly _today: TodayService) {}

  @Get('strip')
  async strip(@Query(new ZodPipe(stripQuery)) q: { from: string; to: string }, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok({ days: await this._today.strip(q.from, q.to, ctx) });
  }

  @Get()
  async get(@Query(new ZodPipe(todayQuery)) q: { date?: string; categoryId?: string }, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._today.get(q.date, ctx, q.categoryId));
  }
}
