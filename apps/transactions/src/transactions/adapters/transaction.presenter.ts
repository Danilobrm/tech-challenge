import type { ListTransactionsResponse, TransactionView } from '@challenge/contracts';

import type { PersistedTransaction } from '../domain/transaction';
import { toStatusLabel } from '../domain/transaction-status';
import type { TransactionListPage } from '../application/list-transactions';

// O formato de leitura e descrito uma vez em `@challenge/contracts` e derivado aqui: o
// dashboard valida a resposta com o mesmo schema, entao renomear um campo deste lado
// quebra a compilacao do outro em vez de quebrar a tela.

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

export function toTransactionListView(page: TransactionListPage): ListTransactionsResponse {
  return {
    items: page.items.map(toTransactionView),
    pagination: page.pagination,
  };
}
