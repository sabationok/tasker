import { Body, Controller, Delete, Get, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Ctx, type RequestCtx } from '../common/context/request-context';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { z } from 'zod';
import {
  checkInSchema,
  checkinsQuerySchema,
  createHabitSchema,
  findManyHabitsSchema,
  updateHabitSchema,
  type CheckInInput,
  type CreateHabitInput,
  type FindManyHabitsQuery,
  type UpdateHabitInput,
} from './dto/habit.schemas';
import { HabitCheckinsService } from './services/habit-checkins';
import { HabitsService } from './services/habits';

const idBody = z.object({ id: z.string().uuid() }).strict();

@Controller('habits')
export class HabitsController {
  constructor(
    private readonly _habits: HabitsService,
    private readonly _checkins: HabitCheckinsService,
  ) {}

  @Get('many')
  async findMany(@Query(new ZodPipe(findManyHabitsSchema)) q: FindManyHabitsQuery) {
    return AppResponse.ok(await this._habits.findMany(q));
  }

  @Get('check-ins')
  async checkins(@Query(new ZodPipe(checkinsQuerySchema)) q: { habitId: string; from: string; to: string }) {
    return AppResponse.ok({ items: await this._checkins.findMany(q.habitId, q.from, q.to) });
  }

  @Get()
  async findOne(@Query('id', ParseUUIDPipe) id: string) {
    return AppResponse.ok(await this._habits.get(id));
  }

  @Post('create')
  async create(@Body(new ZodPipe(createHabitSchema)) dto: CreateHabitInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.created(await this._habits.create(dto, ctx));
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateHabitSchema)) dto: UpdateHabitInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._habits.update(dto, ctx));
  }

  @Post('check-in')
  async checkIn(@Body(new ZodPipe(checkInSchema)) dto: CheckInInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._checkins.checkIn(dto, ctx));
  }

  @Post('archive')
  async archive(@Body(new ZodPipe(idBody)) dto: { id: string }) {
    return AppResponse.ok(await this._habits.archive(dto.id, true));
  }

  @Post('restore')
  async restore(@Body(new ZodPipe(idBody)) dto: { id: string }) {
    return AppResponse.ok(await this._habits.archive(dto.id, false));
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._habits.delete(id);
    return AppResponse.empty();
  }
}
