import { Module } from '@nestjs/common';
import { ItemsModule } from '../../items/items.module';
import { TodayModule } from '../../today/today.module';
import { ReminderSweepService } from './services/reminder-sweep';

/** The minute reminder sweep (needs items, threads and Today, so it sits apart from the base reminders module). */
@Module({ imports: [ItemsModule, TodayModule], providers: [ReminderSweepService] })
export class ReminderSweepModule {}
