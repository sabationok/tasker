import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistService } from './checklist.service';
import { ChecklistItemEntity } from './entities/checklist-item.entity';

/** Checklist rows; the /checklist routes live with items (toggling a periodic line needs occurrences). */
@Global()
@Module({ imports: [TypeOrmModule.forFeature([ChecklistItemEntity])], providers: [ChecklistService], exports: [ChecklistService] })
export class ChecklistModule {}
