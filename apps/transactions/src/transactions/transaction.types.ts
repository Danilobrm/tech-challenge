import type {
  JsonObject,
  MonetaryAmount,
  TransactionResolution,
  TransactionResolutionReason,
} from '@challenge/contracts';

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

/**
 * O que aconteceu ao aplicar um resultado da antifraude. Os tres desfechos que nao sao
 * `applied` sao normais, e nao erro: entrega ao menos uma vez e reprocessamento de topico
 * fazem o mesmo evento chegar mais de uma vez.
 */
export type StatusUpdateOutcome = 'applied' | 'duplicated' | 'ignored' | 'unknown-transaction';

export interface TransactionResolutionUpdate {
  transactionExternalId: string;
  /// Chave da deduplicacao, junto com o id da transacao.
  eventId: string;
  toStatus: TransactionResolution;
  reason: TransactionResolutionReason;
  occurredAt: Date;
}

export interface TransactionStatusStore {
  applyResolution(update: TransactionResolutionUpdate): Promise<StatusUpdateOutcome>;
}
