import { Module } from '@nestjs/common';

import { KafkaEventPublisher, KafkaProducerModule, SystemClock } from '@challenge/messaging';

import { DatabaseModule } from '../database/database.module';
import { OutboxRelay } from './outbox-relay';
import { OUTBOX_BATCH_SIZE, OutboxRelayScheduler } from './outbox-relay.scheduler';
import { PrismaOutboxStore } from './prisma-outbox.store';

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
