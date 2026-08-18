import { Module } from '@nestjs/common';

import { KafkaModule } from '../kafka/kafka.module';
import { SystemClock } from '../shared/clock';
import { RandomIdGenerator } from '../shared/id-generator';
import { TransactionFraudRule } from './fraud-rule';
import { TransactionCreatedHandler } from './transaction-created.handler';
import { TransactionReview } from './transaction-review';

@Module({
  imports: [KafkaModule],
  controllers: [TransactionCreatedHandler],
  providers: [
    {
      // A regra e a traducao sao classes puras: quem as monta e a fabrica, nao o container.
      provide: TransactionReview,
      useFactory: () =>
        new TransactionReview(
          new TransactionFraudRule(),
          new SystemClock(),
          new RandomIdGenerator(),
        ),
    },
  ],
})
export class FraudModule {}
