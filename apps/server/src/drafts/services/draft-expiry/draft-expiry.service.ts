import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DraftsService } from '../../drafts.service';

/** Hourly: drafts past their 24 h TTL → `expired` (each change emits `draft.updated` through `DraftsEvents`). */
@Injectable()
export class DraftExpiryService {
  private readonly _logger = new Logger(DraftExpiryService.name);

  constructor(private readonly _drafts: DraftsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async tick(): Promise<void> {
    const n = await this._drafts.expireOld().catch((e: Error) => (this._logger.error(e.message), 0));
    if (n) this._logger.log(`drafts expired: ${n}`);
  }
}
