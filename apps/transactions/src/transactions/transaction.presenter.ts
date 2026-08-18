import type { PersistedTransaction, TransactionStatusName } from './transaction.types';

/** Formato de leitura do enunciado. */
export interface TransactionView {
  transactionExternalId: string;
  transactionType: { name: string };
  transactionStatus: { name: string };
  value: number;
  createdAt: string;
}

/**
 * Nome publico do status. O enum do banco e um detalhe de armazenamento; a API expoe um
 * vocabulario estavel, que a interface traduz para o idioma do usuario.
 */
const STATUS_NAMES: Record<TransactionStatusName, string> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export function toTransactionView(transaction: PersistedTransaction): TransactionView {
  return {
    transactionExternalId: transaction.transactionExternalId,
    transactionType: { name: transaction.transferTypeName },
    transactionStatus: { name: STATUS_NAMES[transaction.status] },
    // O contrato do enunciado mostra `value` como numero. O schema de entrada ja garante
    // duas casas dentro da faixa exata de `Number`, entao a volta nao perde precisao.
    value: Number(transaction.value),
    createdAt: transaction.createdAt.toISOString(),
  };
}
