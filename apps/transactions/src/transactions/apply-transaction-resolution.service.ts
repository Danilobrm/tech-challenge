import type { TransactionStatusUpdatedEvent } from '@challenge/contracts';

import type { StatusUpdateOutcome, TransactionStatusStore } from './transaction.types';

/**
 * Aplica o resultado da antifraude. Classe pura: traduz o evento para a escrita e devolve
 * o desfecho — quem garante atomicidade e o adaptador.
 */
export class ApplyTransactionResolution {
  constructor(private readonly transactions: TransactionStatusStore) {}

  async execute(event: TransactionStatusUpdatedEvent): Promise<StatusUpdateOutcome> {
    return this.transactions.applyResolution({
      transactionExternalId: event.data.transactionExternalId,
      eventId: event.eventId,
      toStatus: event.data.status,
      reason: event.data.reason,
      // `occurredAt` do envelope e a hora da decisao. O historico guarda quando o fato
      // aconteceu, nao quando a mensagem foi consumida.
      occurredAt: new Date(event.occurredAt),
    });
  }
}
