import { listTransactionsResponseSchema, transactionViewSchema } from '@challenge/contracts';
import type {
  CreateTransactionInput,
  ListTransactionsResponse,
  TransactionView,
} from '@challenge/contracts';

import { requestJson } from '@/lib/api/request-json';

/**
 * A query ja pronta para o fio: chave e valor como a API os recebe. Quem monta o filtro
 * decide o que entra — parametro ausente e filtro nao aplicado, e nao string vazia, que o
 * schema estrito da API recusaria.
 */
export type TransactionListParams = Record<string, string>;

export function fetchTransactionList(
  params: TransactionListParams,
  signal?: AbortSignal,
): Promise<ListTransactionsResponse> {
  return requestJson({
    path: '/transactions',
    searchParams: params,
    schema: listTransactionsResponseSchema,
    signal,
  });
}

export function fetchTransaction(
  transactionExternalId: string,
  signal?: AbortSignal,
): Promise<TransactionView> {
  return requestJson({
    path: `/transactions/${encodeURIComponent(transactionExternalId)}`,
    schema: transactionViewSchema,
    signal,
  });
}

/**
 * A resposta e a transacao recem-criada, ja com status pendente: a validacao da antifraude
 * acontece fora do ciclo desta requisicao, entao o `201` nao promete status final.
 */
export function createTransaction(
  input: CreateTransactionInput,
  signal?: AbortSignal,
): Promise<TransactionView> {
  return requestJson({
    path: '/transactions',
    method: 'POST',
    body: input,
    schema: transactionViewSchema,
    signal,
  });
}
