import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { env } from './config/env';
import { GlobalExceptionFilter } from './common/http/global-exception.filter';

/** The built mini app (apps/app/dist), served same-origin at /assistant/app/ so Mia's origin check passes. */
const MINI_APP_DIST = resolve(__dirname, '../../app/dist');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();
  if (existsSync(MINI_APP_DIST)) {
    app.useStaticAssets(MINI_APP_DIST, { prefix: '/assistant/app/', index: false });
    // SPA fallback: any other GET under /assistant/app/ gets index.html (the session route is a POST).
    app.use('/assistant/app', (req: Request, res: Response, next: NextFunction) => (req.method === 'GET' ? res.sendFile(join(MINI_APP_DIST, 'index.html')) : next()));
  } else console.log(`[tasker] mini app not built (${MINI_APP_DIST}); run pnpm --filter app build`);
  await app.listen(env.PORT, env.BIND_HOST);
  console.log(`[tasker:${env.STAGE}] http://${env.BIND_HOST}:${env.PORT} (MCP at /mcp, mini app at ${env.MINI_APP_URL})`);
}

void bootstrap();
