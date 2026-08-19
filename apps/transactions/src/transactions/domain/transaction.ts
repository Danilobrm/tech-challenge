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

/** Resultado da antifraude, traduzido para o que o banco precisa gravar. */
export interface TransactionResolutionUpdate {
  transactionExternalId: string;
  /// Chave da deduplicacao, junto com o id da transacao.
  eventId: string;
  toStatus: TransactionResolution;
  reason: TransactionResolutionReason;
  occurredAt: Date;
}

/**
 * O que aconteceu ao aplicar um resultado. Os tres desfechos que nao sao `applied` sao
 * normais, e nao erro: entrega ao menos uma vez e reprocessamento de topico fazem o mesmo
 * evento chegar mais de uma vez.
 */
export type StatusUpdateOutcome = 'applied' | 'duplicated' | 'ignored' | 'unknown-transaction';

/**
 * Erro de dominio, nao de infraestrutura: o `transferTypeId` veio do cliente, entao a
 * chave estrangeira quebrada e entrada invalida, e nao defeito do servico.
 */
export class UnknownTransferTypeError extends Error {
  constructor(readonly transferTypeId: number) {
    super(`Tipo de transferencia ${transferTypeId} nao existe`);
    this.name = 'UnknownTransferTypeError';
  }
}

/**
 * Filtros da listagem ja no vocabulario do banco. A borda HTTP traduz o rotulo publico
 * antes de chegar aqui; o adaptador so monta o `WHERE`.
 */
export interface TransactionFilters {
  status?: TransactionStatusName | undefined;
  transferTypeId?: number | undefined;
  createdFrom?: Date | undefined;
  createdTo?: Date | undefined;
}

/** Uma fatia da listagem: os filtros mais a janela de linhas pedida. */
export interface TransactionPageQuery {
  filters: TransactionFilters;
  skip: number;
  take: number;
}

/**
 * `total` e a contagem com os mesmos filtros, sem a janela: e o que permite dizer quantas
 * paginas existem sem varrer todas elas.
 */
export interface TransactionPage {
  items: PersistedTransaction[];
  total: number;
}

/**
 * Erro de dominio: o identificador veio do cliente, entao nao encontrar e resposta
 * legitima da consulta, e nao defeito do servico. A borda HTTP traduz para 404.
 */
export class TransactionNotFoundError extends Error {
  constructor(readonly transactionExternalId: string) {
    super(`Transacao ${transactionExternalId} nao existe`);
    this.name = 'TransactionNotFoundError';
  }
}
