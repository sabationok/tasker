import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { CONNECTOR_SLUG, WEBHOOKS_QUEUE, WEBHOOK_TIMEOUT_MS } from '../constants/webhooks.constants';
import { signWebhook } from '../helpers/sign-webhook';
import type { WebhookJobPayload } from './webhooks.queue';

/** POSTs one event to the key's `events_url`, signed at send time (fresh timestamp per attempt); non-2xx → retry. */
@Processor(WEBHOOKS_QUEUE)
export class WebhooksProcessor extends WorkerHost {
  private readonly _logger = new Logger(WebhooksProcessor.name);

  constructor(private readonly _keys: ApiKeysService) {
    super();
  }

  async process(job: Job<WebhookJobPayload>): Promise<void> {
    const key = await this._keys.getWithSecret(job.data.apiKeyId);
    if (!key?.eventsUrl) return; // revoked or no URL any more: drop
    const body = JSON.stringify(job.data.event);
    const ts = Math.floor(Date.now() / 1000);
    const signature = signWebhook(key.webhookSecret, ts, body);
    const res = await fetch(key.eventsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-connector': CONNECTOR_SLUG, 'x-connector-timestamp': String(ts), 'x-connector-signature': signature, 'x-tasker-signature': signature },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`${job.data.event.type} → ${key.name}: HTTP ${res.status}`);
    this._logger.log(`${job.data.event.type} → ${key.name}: ${res.status}`);
  }
}
