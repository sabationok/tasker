import { Body, Controller, Delete, Get, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Ctx, type RequestCtx } from '../../common/context/request-context';
import { AppResponse } from '../../common/http/app-response';
import { ZodPipe } from '../../common/validation/zod.pipe';
import {
  addNoteSchema,
  completeItemSchema,
  createItemSchema,
  findManyItemsSchema,
  moveOccurrenceSchema,
  reorderItemsSchema,
  skipOccurrenceSchema,
  splitTaskSchema,
  updateItemSchema,
  type CompleteItemInput,
  type CreateItemInput,
  type FindManyItemsQuery,
  type MoveOccurrenceInput,
  type SkipOccurrenceInput,
  type SplitTaskInput,
  type UpdateItemInput,
} from '../dto/item.schemas';
import { ItemOccurrencesService } from '../services/item-occurrences';
import { ItemThreadsService } from '../services/item-threads';
import { ItemsService } from '../services/items';
import { ItemViewsService } from '../services/item-views';

@Controller('items')
export class ItemsController {
  constructor(
    private readonly _items: ItemsService,
    private readonly _occurrences: ItemOccurrencesService,
    private readonly _threads: ItemThreadsService,
    private readonly _views: ItemViewsService,
  ) {}

  @Get('many')
  async findMany(@Query(new ZodPipe(findManyItemsSchema)) q: FindManyItemsQuery) {
    return AppResponse.ok(await this._items.findMany(q));
  }

  @Get('next-task')
  async nextTask() {
    return AppResponse.ok(await this._items.nextTask());
  }

  @Get()
  async findOne(@Query('id', ParseUUIDPipe) id: string) {
    return AppResponse.ok(await this._items.get(id));
  }

  @Post('create')
  async create(@Body(new ZodPipe(createItemSchema)) dto: CreateItemInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.created(await this._items.create(dto, ctx));
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateItemSchema)) dto: UpdateItemInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._items.update(dto, ctx));
  }

  @Post('complete')
  async complete(@Body(new ZodPipe(completeItemSchema)) dto: CompleteItemInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._occurrences.complete(dto, ctx));
  }

  @Post('uncomplete')
  async uncomplete(@Body(new ZodPipe(completeItemSchema)) dto: CompleteItemInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._occurrences.uncomplete(dto, ctx));
  }

  @Post('skip')
  async skip(@Body(new ZodPipe(skipOccurrenceSchema)) dto: SkipOccurrenceInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._occurrences.skip(dto, ctx));
  }

  @Post('move-occurrence')
  async move(@Body(new ZodPipe(moveOccurrenceSchema)) dto: MoveOccurrenceInput, @Ctx() ctx: RequestCtx) {
    return AppResponse.ok(await this._occurrences.move(dto, ctx));
  }

  @Post('split')
  async split(@Body(new ZodPipe(splitTaskSchema)) dto: SplitTaskInput, @Ctx() ctx: RequestCtx) {
    await this._threads.split(dto, ctx);
    return AppResponse.ok(await this._views.one(dto.id));
  }

  @Post('reorder')
  async reorder(@Body(new ZodPipe(reorderItemsSchema)) dto: { parentId?: string | null; ids: string[] }) {
    await this._threads.reorder(dto.parentId ?? null, dto.ids);
    return AppResponse.ok({ items: await this._views.byIds(dto.ids) });
  }

  @Post('add-note')
  async addNote(@Body(new ZodPipe(addNoteSchema)) dto: { id: string; text: string }) {
    return AppResponse.ok(await this._items.addNote(dto.id, dto.text));
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._items.delete(id);
    return AppResponse.empty();
  }
}
