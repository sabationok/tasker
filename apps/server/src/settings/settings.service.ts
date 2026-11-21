import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_SETTINGS } from './constants/default-settings';
import { SettingEntity } from './entities/setting.entity';
import type { Settings } from './types/settings.types';

/** Owner settings as key/value rows, cached in memory (single process, single writer). */
@Injectable()
export class SettingsService {
  private _cache: Settings | null = null;

  constructor(@InjectRepository(SettingEntity) private readonly _repo: Repository<SettingEntity>) {}

  async get(): Promise<Settings> {
    if (this._cache) return this._cache;
    const rows = await this._repo.find();
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Settings>;
    this._cache = { ...DEFAULT_SETTINGS, ...stored };
    return this._cache;
  }

  async update(patch: Partial<Settings>): Promise<Settings> {
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (entries.length) await this._repo.upsert(entries.map(([key, value]) => ({ key, value })), ['key']);
    this._cache = null;
    return this.get();
  }
}
