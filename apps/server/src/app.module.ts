import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { env } from './config/env';
import { redisConnection } from './common/redis/helpers/redis-connection';
import { EventsModule } from './events/events.module';
import { ReminderSweepModule } from './reminders/sweep/reminder-sweep.module';
import { AgentsModule } from './agents/agents.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AppSessionModule } from './app-session/app-session.module';
import { CategoriesModule } from './categories/categories.module';
import { ChecklistModule } from './checklist/checklist.module';
import { HabitsModule } from './habits/habits.module';
import { ItemsModule } from './items/items.module';
import { ReminderRoutesModule } from './reminders/routes/reminder-routes.module';
import { RemindersModule } from './reminders/reminders.module';
import { ProjectsModule } from './projects/projects.module';
import { StatsModule } from './stats/stats.module';
import { TagsModule } from './tags/tags.module';
import { TodayModule } from './today/today.module';
import { RedisModule } from './common/redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { DraftsModule } from './drafts/drafts.module';
import { ToolsModule } from './tools/tools.module';
import { McpModule } from './mcp/mcp.module';
import { ConnectorManifestModule } from './connector-manifest/connector-manifest.module';
import { HealthController } from './health/health.controller';
import { SettingsModule } from './settings/settings.module';

@Module({
  // TODO(redis-prefix): BullModule.forRoot needs prefix: `bull:${env.REDIS_PREFIX}` — see docs/superpowers/specs/2026-11-21-redis-prefix-design.md
  imports: [ScheduleModule.forRoot(), BullModule.forRoot({ connection: redisConnection(env.REDIS_URL) }), EventsModule, ReminderSweepModule, DatabaseModule, RedisModule, SettingsModule, AppSessionModule, ApiKeysModule, AgentsModule, CategoriesModule, ProjectsModule, TagsModule, ChecklistModule, RemindersModule, ItemsModule, HabitsModule, ReminderRoutesModule, TodayModule, StatsModule, DraftsModule, ToolsModule, McpModule, ConnectorManifestModule],
  controllers: [HealthController],
})
export class AppModule {}
