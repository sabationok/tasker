import { Module } from '@nestjs/common';
import { HabitsModule } from '../../habits/habits.module';
import { ItemsModule } from '../../items/items.module';
import { RemindersController } from './reminders.controller';

@Module({ imports: [ItemsModule, HabitsModule], controllers: [RemindersController] })
export class ReminderRoutesModule {}
