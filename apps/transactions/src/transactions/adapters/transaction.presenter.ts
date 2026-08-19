import type { TransactionStatusLabel } from '@challenge/contracts';

import type { PersistedTransaction } from '../domain/transaction';
import { toStatusLabel } from '../domain/transaction-status';

/** Formato de leitura do enunciado. */
export interface TransactionView {
  transactionExternalId: string;
  transactionType: { name: string };
  /// O rotulo, e nao `string`: e o mesmo tipo que o filtro da listagem aceita, entao
  /// resposta e filtro nao tem como divergir sem quebrar a compilacao.
  transactionStatus: { name: TransactionStatusLabel };
  value: number;
  createdAt: string;
}

export function toTransactionView(transaction: PersistedTransaction): TransactionView {
  return {
    transactionExternalId: transaction.transactionExternalId,
    transactionType: { name: transaction.transferTypeName },
    // O enum do banco e detalhe de armazenamento; a API expoe um vocabulario estavel, que
    // a interface traduz para o idioma do usuario.
    transactionStatus: { name: toStatusLabel(transaction.status) },
    // O contrato do enunciado mostra `value` como numero. O schema de entrada ja garante
    // duas casas dentro da faixa exata de `Number`, entao a volta nao perde precisao.
    value: Number(transaction.value),
    createdAt: transaction.createdAt.toISOString(),
  };
}
