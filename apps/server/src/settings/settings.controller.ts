import { Body, Controller, Get, Put } from '@nestjs/common';
import { AppResponse } from '../common/http/app-response';
import { ZodPipe } from '../common/validation/zod.pipe';
import { updateSettingsSchema, type UpdateSettingsInput } from './dto/update-settings.schema';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly _settings: SettingsService) {}

  @Get()
  async get() {
    const { toolsSchemaHash: _, uiManifestVersion: __, ...settings } = await this._settings.get();
    return AppResponse.ok(settings);
  }

  @Put('update')
  async update(@Body(new ZodPipe(updateSettingsSchema)) dto: UpdateSettingsInput) {
    const { toolsSchemaHash: _, uiManifestVersion: __, ...settings } = await this._settings.update(dto);
    return AppResponse.ok(settings);
  }
}
