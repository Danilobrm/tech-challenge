import {
  TRANSACTION_STATUS_UPDATED,
  TRANSACTION_STATUS_UPDATED_VERSION,
  transactionStatusUpdatedEventSchema,
} from '@challenge/contracts';
import type { TransactionCreatedEvent, TransactionStatusUpdatedEvent } from '@challenge/contracts';

import type { Clock } from '../shared/clock';
import type { IdGenerator } from '../shared/id-generator';
import type { TransactionFraudRule } from './fraud-rule';

/**
 * Traduz o evento de criacao no evento de resultado. Puro: recebe um evento, devolve
 * outro, sem tocar em rede nem em banco — o antifraude nao tem estado proprio, tudo o que
 * ele precisa chega no payload.
 */
export class TransactionReview {
  constructor(
    private readonly rule: TransactionFraudRule,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  review(event: TransactionCreatedEvent): TransactionStatusUpdatedEvent {
    const decision = this.rule.evaluate(event.data.value);

    return transactionStatusUpdatedEventSchema.parse({
      eventId: this.ids.next(),
      eventType: TRANSACTION_STATUS_UPDATED,
      version: TRANSACTION_STATUS_UPDATED_VERSION,
      // Hora da decisao, que e o fato que este evento carrega.
      occurredAt: this.clock.now().toISOString(),
      // Propaga a correlacao: criacao e resultado ficam na mesma linha de investigacao.
      correlationId: event.correlationId,
      data: {
        transactionExternalId: event.data.transactionExternalId,
        status: decision.status,
        reason: decision.reason,
      },
    });
  }
}
