import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DraftsEvents } from './drafts.events';
import { DraftsService } from './drafts.service';
import { DraftEntity } from './entities/draft.entity';
import { DraftExpiryService } from './services/draft-expiry';

@Global()
@Module({ imports: [TypeOrmModule.forFeature([DraftEntity])], providers: [DraftsService, DraftsEvents, DraftExpiryService], exports: [DraftsService, DraftsEvents] })
export class DraftsModule {}
