import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { WEBHOOKS_QUEUE } from '../constants/webhooks.constants';
import type { ConnectorEvent } from '../types/connector-event.types';

export type WebhookJobPayload = { apiKeyId: string; event: ConnectorEvent };
export type WebhooksJobsMap = { deliver: WebhookJobPayload };

/** The only user of the `webhooks` queue: one `deliver` job per key and event. */
@Injectable()
export class WebhooksQueueService {
  constructor(@InjectQueue(WEBHOOKS_QUEUE) private readonly _queue: Queue<WebhookJobPayload>) {}

  add<N extends keyof WebhooksJobsMap>(name: N, payload: WebhooksJobsMap[N]): Promise<unknown> {
    return this._queue.add(name, payload, {
      attempts: 10,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 24 * 3600 },
    });
  }
}
