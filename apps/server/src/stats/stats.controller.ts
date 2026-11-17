import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { Ctx, type RequestCtx } from '../common/context/request-context';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { StatsService } from './services/stats';

export const statsQuerySchema = z
  .object({
    period: z.enum(['week', 'month', 'year', 'all']).default('week').describe('week, month, year or all time'),
    anchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('A day inside the period, YYYY-MM-DD; default today'),
    scope: z.enum(['habits', 'tasks', 'all']).default('habits').describe('habits, periodic + dated tasks, or both'),
  })
  .strict();

@Controller('stats')
export class StatsController {
  constructor(private readonly _stats: StatsService) {}

  @Get()
  async get(@Query(new ZodPipe(statsQuerySchema)) q: z.infer<typeof statsQuerySchema>, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._stats.get(q, ctx));
  }
}
