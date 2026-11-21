import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitEntity } from '../habits/entities/habit.entity';
import { HabitsModule } from '../habits/habits.module';
import { ItemEntity } from '../items/entities/item.entity';
import { ItemsModule } from '../items/items.module';
import { StatsModule } from '../stats/stats.module';
import { TodayModule } from '../today/today.module';
import { DraftsController } from './drafts.controller';
import { PreviewService } from './services/preview/preview.service';
import { ToolsRegistry } from './tools.registry';

@Module({
  imports: [TypeOrmModule.forFeature([ItemEntity, HabitEntity]), ItemsModule, HabitsModule, TodayModule, StatsModule],
  controllers: [DraftsController],
  providers: [ToolsRegistry, PreviewService],
  exports: [ToolsRegistry],
})
export class ToolsModule {}
