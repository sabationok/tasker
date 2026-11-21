import { Body, Controller, Delete, Get, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { ApiKeysService } from './api-keys.service';
import { createApiKeySchema, updateApiKeySchema, type CreateApiKeyInput, type UpdateApiKeyInput } from './dto/api-key.schemas';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly _keys: ApiKeysService) {}

  @Get('many')
  async findMany() {
    return AppResponse.ok({ items: await this._keys.findMany() });
  }

  @Post('create')
  async create(@Body(new ZodPipe(createApiKeySchema)) dto: CreateApiKeyInput) {
    return AppResponse.created(await this._keys.create(dto.name, dto.eventsUrl), 'Store the key now: it is shown only once');
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateApiKeySchema)) dto: UpdateApiKeyInput) {
    return AppResponse.ok(await this._keys.update(dto));
  }

  @Delete('delete')
  async delete(@Query('id', ParseUUIDPipe) id: string) {
    await this._keys.revoke(id);
    return AppResponse.empty();
  }
}
