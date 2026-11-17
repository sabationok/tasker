import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env';
import { GlobalExceptionFilter } from './common/http/global-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(env.PORT, env.BIND_HOST);
  console.log(`[tasker] http://${env.BIND_HOST}:${env.PORT} (MCP at /mcp)`);
}

void bootstrap();
