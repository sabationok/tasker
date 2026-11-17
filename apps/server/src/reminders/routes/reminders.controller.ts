import { Body, Controller, Delete, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Ctx, type RequestCtx } from '../../common/context/request-context';
import { AppException } from '../../common/http/app-exception';
import { AppResponse } from '../../common/http/app-response';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { HabitsService } from '../../habits/services/habits';
import { ItemsService } from '../../items/services/items';
import { createReminderSchema, type CreateReminderInput, type ReminderInput } from '../dto/reminder-input.schema';
import { RemindersService } from '../reminders.service';

/** `/reminders/create|delete` for an item or a habit (owner checked through its own service). */
@Controller('reminders')
export class RemindersController {
  constructor(
    private readonly _reminders: RemindersService,
    private readonly _items: ItemsService,
    private readonly _habits: HabitsService,
  ) {}

  @Post('create')
  async create(@Body(new ZodPipe(createReminderSchema)) dto: CreateReminderInput, @Ctx() ctx: RequestCtx) {
    const input = (dto.at ? { at: dto.at } : dto.timeOfDay ? { timeOfDay: dto.timeOfDay } : { offsetMin: dto.offsetMin as number }) as ReminderInput;
    if (dto.itemId) {
      const item = await this._items.getOrFail(dto.itemId);
      const errors = this._reminders.check([input], { periodic: Boolean(item.recurrence), hasDueAt: Boolean(item.dueAt) }, ctx);
      if (errors.length) throw AppException.invalid(errors);
      return AppResponse.created(await this._reminders.create({ itemId: item.id }, input));
    }
    const habit = await this._habits.getOrFail(dto.habitId as string);
    const errors = this._reminders.check([input], { periodic: true, hasDueAt: false }, ctx);
    if (errors.length) throw AppException.invalid(errors);
    return AppResponse.created(await this._reminders.create({ habitId: habit.id }, input));
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._reminders.delete(id);
    return AppResponse.empty();
  }
}
