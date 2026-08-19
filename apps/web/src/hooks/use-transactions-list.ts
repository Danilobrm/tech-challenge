'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ListTransactionsResponse } from '@challenge/contracts';

import { ApiError } from '@/lib/api/api-error';
import { fetchTransactionList } from '@/lib/api/transactions';
import { toListParams } from '@/lib/transactions/list-params';
import type { TransactionFilters } from '@/lib/transactions/list-params';

/**
 * Os tres estados da tela como tres formas distintas, e nao como tres booleanos soltos.
 * `carregando && erro` deixa de ser representavel, entao a tela nao tem como cair no meio
 * termo de mostrar a espera e a falha ao mesmo tempo.
 *
 * `refreshing` mora dentro de `ready` porque uma busca com resultado ja na tela nao e o
 * mesmo estado da primeira: desmontar a tabela para remontar logo em seguida tiraria o foco
 * do teclado do botao que acabou de ser clicado.
 */
export type TransactionsListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; page: ListTransactionsResponse; refreshing: boolean };

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    return error.kind === 'network'
      ? 'Nao foi possivel falar com a API. Verifique se o servico de transacoes esta no ar.'
      : error.message;
  }

  return 'Nao foi possivel carregar as transacoes.';
}

export interface TransactionsListController {
  state: TransactionsListState;
  /** Refaz a busca com os mesmos filtros. E a acao do botao de tentar novamente. */
  reload: () => void;
}

export function useTransactionsList(
  filters: TransactionFilters,
  page: number,
): TransactionsListController {
  const [state, setState] = useState<TransactionsListState>({ kind: 'loading' });
  // Contador, e nao booleano: duas tentativas seguidas precisam ser dois valores diferentes
  // para o efeito rodar de novo.
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  // A query serializada, e nao o objeto de filtros: dependencia por identidade prenderia o
  // efeito ao acaso de quem chama guardar o objeto em estado, e um literal a cada render
  // viraria busca infinita.
  const paramsKey = JSON.stringify(toListParams(filters, page));

  useEffect(() => {
    const controller = new AbortController();
    const params = JSON.parse(paramsKey) as Record<string, string>;

    setState((current) =>
      current.kind === 'ready' ? { ...current, refreshing: true } : { kind: 'loading' },
    );

    fetchTransactionList(params, controller.signal)
      .then((result) => {
        setState({ kind: 'ready', page: result, refreshing: false });
      })
      .catch((error: unknown) => {
        // Resposta de uma busca que a tela ja descartou — trocou o filtro antes de chegar.
        // Escreve-la no estado sobreporia a busca corrente.
        if (controller.signal.aborted) {
          return;
        }

        setState({ kind: 'error', message: describeFailure(error) });
      });

    return () => {
      controller.abort();
    };
  }, [paramsKey, attempt]);

  return { state, reload };
}
