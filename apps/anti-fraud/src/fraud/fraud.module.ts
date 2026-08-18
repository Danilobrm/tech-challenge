import { Module } from '@nestjs/common';

import { KafkaProducerModule, RandomIdGenerator, SystemClock } from '@challenge/messaging';

import { TransactionFraudRule } from './fraud-rule';
import { TransactionCreatedHandler } from './transaction-created.handler';
import { TransactionReview } from './transaction-review';

@Module({
  imports: [KafkaProducerModule.forService('anti-fraud')],
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
