import { Body, Controller, Delete, Get, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { CategoriesService } from './categories.service';
import { createCategorySchema, reorderSchema, updateCategorySchema, type CreateCategoryInput, type UpdateCategoryInput } from './dto/category.schemas';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly _categories: CategoriesService) {}

  @Get('many')
  async findMany(@Query('search') search?: string, @Query('archived') archived?: string) {
    if (search) return AppResponse.ok({ items: await this._categories.lookup(search, 50) });
    return AppResponse.ok({ items: await this._categories.findMany(archived === 'true') });
  }

  @Get()
  async findOne(@Query('id', ParseUUIDPipe) id: string) {
    return AppResponse.ok(await this._categories.getOrFail(id, true));
  }

  @Post('create')
  async create(@Body(new ZodPipe(createCategorySchema)) dto: CreateCategoryInput) {
    return AppResponse.created(await this._categories.create(dto));
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateCategorySchema)) dto: UpdateCategoryInput) {
    return AppResponse.ok(await this._categories.update(dto));
  }

  @Post('reorder')
  async reorder(@Body(new ZodPipe(reorderSchema)) dto: { ids: string[] }) {
    return AppResponse.ok({ items: await this._categories.reorder(dto.ids) });
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._categories.delete(id);
    return AppResponse.empty();
  }
}
