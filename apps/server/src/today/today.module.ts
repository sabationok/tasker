import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitsModule } from '../habits/habits.module';
import { ItemEntity } from '../items/entities/item.entity';
import { ItemsModule } from '../items/items.module';
import { TodayService } from './services/today';
import { TodayController } from './today.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ItemEntity]), ItemsModule, HabitsModule],
  controllers: [TodayController],
  providers: [TodayService],
  exports: [TodayService],
})
export class TodayModule {}
