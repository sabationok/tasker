import { Injectable, type OnModuleInit } from '@nestjs/common';
import { DraftsEvents } from '../drafts/drafts.events';
import { EventsService } from './events.service';

/** Draft status changes (saved / discarded / expired) → `draft.updated` webhook to the draft's key. */
@Injectable()
export class EventsListener implements OnModuleInit {
  constructor(
    private readonly _drafts: DraftsEvents,
    private readonly _events: EventsService,
  ) {}

  onModuleInit(): void {
    this._drafts.subscribe(async (c) => {
      if (c.status === 'draft' || c.status === 'saving') return;
      await this._events.emitToKey(c.apiKeyId, {
        connector: 'tasker', type: 'draft.updated', draftId: c.draftId, batchId: c.batchId, status: c.status,
        ...(c.resultId && { itemId: c.resultId }), ...(c.resultLabel && { label: c.resultLabel }),
      });
    });
  }
}
