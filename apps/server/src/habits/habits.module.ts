import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitCheckinEntity } from './entities/habit-checkin.entity';
import { HabitChecklistItemEntity } from './entities/habit-checklist-item.entity';
import { HabitEntity } from './entities/habit.entity';
import { HabitsController } from './habits.controller';
import { HabitCheckinsService } from './services/habit-checkins';
import { HabitsService } from './services/habits';

@Module({
  imports: [TypeOrmModule.forFeature([HabitEntity, HabitChecklistItemEntity, HabitCheckinEntity])],
  controllers: [HabitsController],
  providers: [HabitsService, HabitCheckinsService],
  exports: [HabitsService, HabitCheckinsService],
})
export class HabitsModule {}
