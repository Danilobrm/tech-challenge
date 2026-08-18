import type { JsonObject, MonetaryAmount } from '@challenge/contracts';

export type TransactionStatusName = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Transacao como ela e gravada: valor ja no formato exato, hora do fato ja decidida. */
export interface NewPendingTransaction {
  accountExternalIdDebit: string;
  accountExternalIdCredit: string;
  transferTypeId: number;
  value: MonetaryAmount;
  createdAt: Date;
}

/** O que o banco devolveu, no vocabulario do dominio — sem tipos do Prisma vazando. */
export interface PersistedTransaction {
  transactionExternalId: string;
  transferTypeName: string;
  status: TransactionStatusName;
  value: MonetaryAmount;
  createdAt: Date;
}

/** Linha da outbox pronta para ser gravada junto do agregado. */
export interface OutboxMessageDraft {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: JsonObject;
  occurredAt: Date;
}

/**
 * A porta recebe o construtor do evento em vez do evento pronto porque o
 * `transactionExternalId` so existe depois do insert — e ele precisa entrar no payload
 * dentro da mesma transacao, senao a outbox deixa de ser atomica com o agregado.
 */
export interface PendingTransactionWriter {
  savePending(
    transaction: NewPendingTransaction,
    describeCreation: (transactionExternalId: string) => OutboxMessageDraft,
  ): Promise<PersistedTransaction>;
}
