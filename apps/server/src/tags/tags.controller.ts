import { Body, Controller, Delete, Get, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { createTagSchema, updateTagSchema, type CreateTagInput, type UpdateTagInput } from './dto/tag.schemas';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly _tags: TagsService) {}

  @Get('many')
  async findMany(@Query('search') search?: string) {
    return AppResponse.ok({ items: search ? await this._tags.lookup(search, 50) : await this._tags.findMany() });
  }

  @Get()
  async findOne(@Query('id', ParseUUIDPipe) id: string) {
    return AppResponse.ok(await this._tags.getOrFail(id));
  }

  @Post('create')
  async create(@Body(new ZodPipe(createTagSchema)) dto: CreateTagInput) {
    return AppResponse.created(await this._tags.create(dto));
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateTagSchema)) dto: UpdateTagInput) {
    return AppResponse.ok(await this._tags.update(dto));
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._tags.delete(id);
    return AppResponse.empty();
  }
}
