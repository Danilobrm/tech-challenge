import { Module } from '@nestjs/common';

import { KafkaEventPublisher, KafkaProducerModule, SystemClock } from '@challenge/messaging';

import { DatabaseModule } from '../database/database.module';
import { OUTBOX_BATCH_SIZE, OutboxRelayScheduler } from './adapters/outbox-relay.scheduler';
import { PrismaOutboxStore } from './adapters/prisma-outbox.store';
import { OutboxRelay } from './application/outbox-relay';

@Module({
  imports: [DatabaseModule, KafkaProducerModule.forService('transactions')],
  providers: [
    PrismaOutboxStore,
    {
      provide: OutboxRelay,
      useFactory: (store: PrismaOutboxStore, publisher: KafkaEventPublisher) =>
        new OutboxRelay(store, publisher, new SystemClock(), OUTBOX_BATCH_SIZE),
      inject: [PrismaOutboxStore, KafkaEventPublisher],
    },
    OutboxRelayScheduler,
  ],
})
export class OutboxModule {}
