import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { KafkaModule } from '../kafka/kafka.module';
import { KafkaEventPublisher } from '../kafka/kafka-event.publisher';
import { SystemClock } from '../shared/clock';
import { OutboxRelay } from './outbox-relay';
import { OUTBOX_BATCH_SIZE, OutboxRelayScheduler } from './outbox-relay.scheduler';
import { PrismaOutboxStore } from './prisma-outbox.store';

@Module({
  imports: [DatabaseModule, KafkaModule],
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
