import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { WEBHOOKS_QUEUE } from './constants/webhooks.constants';
import { EventsListener } from './events.listener';
import { EventsService } from './events.service';
import { WebhooksProcessor } from './queues/webhooks.processor';
import { WebhooksQueueService } from './queues/webhooks.queue';

/** Signed webhooks to agents (BullMQ `webhooks`): `draft.updated`, `reminder.due`. */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOKS_QUEUE })],
  providers: [EventsService, EventsListener, WebhooksQueueService, WebhooksProcessor],
  exports: [EventsService],
})
export class EventsModule {}
