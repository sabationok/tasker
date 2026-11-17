import { Global, Module } from '@nestjs/common';
import IORedis from 'ioredis';
import { env } from '../../config/env';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [{ provide: REDIS, useFactory: () => new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) }],
  exports: [REDIS],
})
export class RedisModule {}
