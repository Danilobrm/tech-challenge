'use client';

import { useCallback } from 'react';
import type { ListTransactionsResponse } from '@challenge/contracts';

import { useRemoteResource } from '@/hooks/use-remote-resource';
import type { RemoteResource, RemoteResourceState } from '@/hooks/use-remote-resource';
import { ApiError } from '@/lib/api/api-error';
import { fetchTransactionList } from '@/lib/api/transactions';
import { toListParams } from '@/lib/transactions/list-params';
import type { TransactionFilters } from '@/lib/transactions/list-params';

export type TransactionsListState = RemoteResourceState<ListTransactionsResponse, string>;

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    return error.kind === 'network'
      ? 'Nao foi possivel falar com a API. Verifique se o servico de transacoes esta no ar.'
      : error.message;
  }

  return 'Nao foi possivel carregar as transacoes.';
}

export function useTransactionsList(
  filters: TransactionFilters,
  page: number,
): RemoteResource<ListTransactionsResponse, string> {
  // A query serializada, e nao o objeto de filtros: dependencia por identidade prenderia a
  // busca ao acaso de quem chama guardar o objeto em estado, e um literal a cada render
  // viraria busca infinita.
  const paramsKey = JSON.stringify(toListParams(filters, page));

  const read = useCallback(
    (signal: AbortSignal) =>
      fetchTransactionList(JSON.parse(paramsKey) as Record<string, string>, signal),
    [paramsKey],
  );

  return useRemoteResource(read, describeFailure);
}
