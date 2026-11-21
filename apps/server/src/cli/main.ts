import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { DatabaseModule } from '../database/database.module';
import { SettingsModule } from '../settings/settings.module';

@Module({ imports: [DatabaseModule, SettingsModule, ApiKeysModule] })
class CliModule {}

const USAGE = 'usage: pnpm tasker api-key create <name> [--events-url <url>] | api-key list | api-key revoke <id>';

/** `pnpm tasker api-key …` — works without a key (local admin). */
async function main(): Promise<void> {
  const [scope, action, ...rest] = process.argv.slice(2);
  if (scope !== 'api-key') throw new Error(USAGE);
  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error'] });
  const keys = app.get(ApiKeysService);
  try {
    if (action === 'create') {
      const name = rest[0];
      if (!name) throw new Error(USAGE);
      const i = rest.indexOf('--events-url');
      const { key, apiKey } = await keys.create(name, i >= 0 ? rest[i + 1] : null);
      console.log(`created ${apiKey.name} (${apiKey.id})\nkey (shown once): ${key}`);
    } else if (action === 'list') {
      for (const k of await keys.findMany()) console.log(`${k.id}  ${k.prefix}…  ${k.name}  ${k.revokedAt ? 'revoked' : 'active'}  ${k.eventsUrl ?? '-'}`);
    } else if (action === 'revoke') {
      await keys.revoke(rest[0]);
      console.log('revoked');
    } else throw new Error(USAGE);
  } finally {
    await app.close();
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
