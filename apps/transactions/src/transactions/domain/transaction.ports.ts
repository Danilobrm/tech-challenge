import type {
  NewPendingTransaction,
  OutboxMessageDraft,
  PersistedTransaction,
  StatusUpdateOutcome,
  TransactionResolutionUpdate,
} from './transaction';

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

export interface TransactionStatusStore {
  applyResolution(update: TransactionResolutionUpdate): Promise<StatusUpdateOutcome>;
}
