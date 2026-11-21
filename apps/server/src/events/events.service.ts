import { Injectable } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { WebhooksQueueService } from './queues/webhooks.queue';
import type { ConnectorEvent } from './types/connector-event.types';

/** Queues connector events as signed webhooks: to one key, or to every active key with an `events_url`. */
@Injectable()
export class EventsService {
  constructor(
    private readonly _keys: ApiKeysService,
    private readonly _queue: WebhooksQueueService,
  ) {}

  async emitToKey(apiKeyId: string | null, event: ConnectorEvent): Promise<boolean> {
    if (!apiKeyId) return false;
    const key = await this._keys.getWithSecret(apiKeyId);
    if (!key?.eventsUrl) return false;
    await this._queue.add('deliver', { apiKeyId, event });
    return true;
  }

  async emitToAll(event: ConnectorEvent): Promise<number> {
    const keys = await this._keys.listWithEvents();
    for (const k of keys) await this._queue.add('deliver', { apiKeyId: k.id, event });
    return keys.length;
  }
}
