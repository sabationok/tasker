import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderEntity } from './entities/reminder.entity';
import { RemindersService } from './reminders.service';

/** Reminder rows; routes live with their owners (items, habits). */
@Global()
@Module({ imports: [TypeOrmModule.forFeature([ReminderEntity])], providers: [RemindersService], exports: [RemindersService] })
export class RemindersModule {}
