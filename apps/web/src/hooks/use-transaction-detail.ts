'use client';

import { useCallback } from 'react';
import type { TransactionView } from '@challenge/contracts';

import { useRemoteResource } from '@/hooks/use-remote-resource';
import type { RemoteResource } from '@/hooks/use-remote-resource';
import { ApiError } from '@/lib/api/api-error';
import { fetchTransaction } from '@/lib/api/transactions';

/**
 * A falha do detalhe nao cabe numa frase so. "Essa transacao nao existe" e um beco sem
 * saida — repetir a requisicao devolve o mesmo 404 —, enquanto "a API nao respondeu" e uma
 * falha que tentar de novo costuma resolver.
 */
export interface TransactionDetailFailure {
  title: string;
  description: string;
  retryable: boolean;
}

/**
 * Status que continuam valendo a pena repetir. `408` e `429` sao a propria API pedindo que
 * se tente de novo; o resto da familia `4xx` e recusa do que foi pedido, e repetir a mesma
 * requisicao devolve a mesma recusa.
 */
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

function isDeadEnd(status: number | undefined): boolean {
  return (
    status !== undefined && status >= 400 && status < 500 && !RETRYABLE_CLIENT_STATUSES.has(status)
  );
}

function describeFailure(error: unknown): TransactionDetailFailure {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return {
        title: 'Transacao nao encontrada',
        description: 'Nenhuma transacao responde por esse identificador.',
        retryable: false,
      };
    }

    if (isDeadEnd(error.status)) {
      return {
        title: 'Nao foi possivel abrir esta transacao',
        description: `O identificador do endereco nao serve para consultar: ${error.message}`,
        retryable: false,
      };
    }

    return {
      title: 'Nao foi possivel carregar a transacao',
      description:
        error.kind === 'network'
          ? 'Verifique se o servico de transacoes esta no ar.'
          : error.message,
      retryable: true,
    };
  }

  return {
    title: 'Nao foi possivel carregar a transacao',
    description: 'A leitura falhou por um motivo inesperado.',
    retryable: true,
  };
}

export function useTransactionDetail(
  transactionExternalId: string,
): RemoteResource<TransactionView, TransactionDetailFailure> {
  const read = useCallback(
    (signal: AbortSignal) => fetchTransaction(transactionExternalId, signal),
    [transactionExternalId],
  );

  return useRemoteResource(read, describeFailure);
}
