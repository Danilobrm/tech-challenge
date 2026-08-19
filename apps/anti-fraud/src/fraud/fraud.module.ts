import { Module } from '@nestjs/common';

import { KafkaProducerModule, SystemClock, UuidV5IdGenerator } from '@challenge/messaging';

import { TransactionCreatedHandler } from './adapters/transaction-created.handler';
import { TransactionReview } from './application/transaction-review';
import { TransactionFraudRule } from './domain/fraud-rule';

/**
 * Namespace do uuid v5 do resultado da antifraude. Fixo no codigo de proposito: mudar
 * este valor troca a identidade de todo evento ja publicado e reabre a porta para
 * duplicata no consumidor.
 */
const STATUS_UPDATED_ID_NAMESPACE = '9f2a6d4e-1c63-4f9b-8a71-5d0e3b7c2a48';

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
          new UuidV5IdGenerator(STATUS_UPDATED_ID_NAMESPACE),
        ),
    },
  ],
})
export class FraudModule {}
