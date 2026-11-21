import { Controller, Get, Inject } from '@nestjs/common';
import type IORedis from 'ioredis';
import { DataSource } from 'typeorm';
import { REDIS } from '../common/redis/redis.module';
import { AppResponse } from '../common/http/app-response';
import { Public } from '../api-keys/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly _db: DataSource,
    @Inject(REDIS) private readonly _redis: IORedis,
  ) {}

  @Public()
  @Get()
  async get() {
    const db = await this._db.query('select 1').then(() => true, () => false);
    const redis = await this._redis.ping().then((r) => r === 'PONG', () => false);
    return AppResponse.ok({ ok: db && redis, db, redis });
  }
}
