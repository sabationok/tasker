import { Body, Controller, Delete, Post, Put, Query, ParseUUIDPipe } from '@nestjs/common';
import { ChecklistService } from '../../checklist/checklist.service';
import { createChecklistLineSchema, toggleChecklistLineSchema, updateChecklistLineSchema } from '../../checklist/dto/checklist.schemas';
import { Ctx, type RequestCtx } from '../../common/context/request-context';
import { AppResponse } from '../../common/http/app-response';
import { ZodPipe } from '../../common/validation/zod.pipe';
import { ItemOccurrencesService } from '../services/item-occurrences';
import { ItemsService } from '../services/items';
import { ItemViewsService } from '../services/item-views';

@Controller('checklist')
export class ChecklistController {
  constructor(
    private readonly _checklist: ChecklistService,
    private readonly _items: ItemsService,
    private readonly _occurrences: ItemOccurrencesService,
    private readonly _views: ItemViewsService,
  ) {}

  @Post('create')
  async create(@Body(new ZodPipe(createChecklistLineSchema)) dto: { itemId: string; title: string }) {
    await this._items.getOrFail(dto.itemId);
    await this._checklist.create(dto.itemId, dto.title);
    return AppResponse.created(await this._views.one(dto.itemId));
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateChecklistLineSchema)) dto: { id: string; title?: string; position?: number }) {
    const line = await this._checklist.update(dto.id, dto);
    return AppResponse.ok(await this._views.one(line.itemId));
  }

  @Post('toggle')
  async toggle(@Body(new ZodPipe(toggleChecklistLineSchema)) dto: { id: string; date?: string; slot?: number }, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._occurrences.toggleChecklistLine(dto.id, ctx, dto.date, dto.slot));
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._checklist.delete(id);
    return AppResponse.empty();
  }
}
