import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ChecklistController } from './controllers/checklist.controller';
import { ItemsController } from './controllers/items.controller';
import { ItemOccurrenceEntity } from './entities/item-occurrence.entity';
import { ItemEntity } from './entities/item.entity';
import { ItemAssignmentsService } from './services/item-assignments';
import { ItemOccurrencesService } from './services/item-occurrences';
import { ItemThreadsService } from './services/item-threads';
import { ItemViewsService } from './services/item-views';
import { ItemsService } from './services/items';

@Module({
  imports: [TypeOrmModule.forFeature([ItemEntity, ItemOccurrenceEntity, ProjectEntity])],
  controllers: [ItemsController, ChecklistController],
  providers: [ItemsService, ItemAssignmentsService, ItemThreadsService, ItemViewsService, ItemOccurrencesService],
  exports: [ItemsService, ItemAssignmentsService, ItemThreadsService, ItemViewsService, ItemOccurrencesService],
})
export class ItemsModule {}
