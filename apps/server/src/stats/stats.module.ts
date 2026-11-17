import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitsModule } from '../habits/habits.module';
import { ItemEntity } from '../items/entities/item.entity';
import { ItemsModule } from '../items/items.module';
import { StatsService } from './services/stats';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ItemEntity]), ItemsModule, HabitsModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
