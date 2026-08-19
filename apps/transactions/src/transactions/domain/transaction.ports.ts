import type {
  NewPendingTransaction,
  OutboxMessageDraft,
  PersistedTransaction,
  StatusUpdateOutcome,
  TransactionPage,
  TransactionPageQuery,
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

/**
 * Leitura separada da escrita: consultar nao precisa de outbox, de evento nem de
 * compare-and-set, e juntar as duas numa porta so obrigaria cada dobra de teste a
 * implementar metodos que o caso de uso testado nem chama.
 */
export interface TransactionReader {
  findById(transactionExternalId: string): Promise<PersistedTransaction | null>;
  list(query: TransactionPageQuery): Promise<TransactionPage>;
}
