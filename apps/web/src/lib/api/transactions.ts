import { listTransactionsResponseSchema } from '@challenge/contracts';
import type { ListTransactionsResponse } from '@challenge/contracts';

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
