'use client';

import { TransactionDetailCard } from '@/components/transactions/transaction-detail-card';
import { Button } from '@/components/ui/button';
import { InlineLink } from '@/components/ui/inline-link';
import { Spinner } from '@/components/ui/spinner';
import { StatusPanel } from '@/components/ui/status-panel';
import { usePolling } from '@/hooks/use-polling';
import { useTransactionDetail } from '@/hooks/use-transaction-detail';
import { statusText } from '@/lib/transactions/format';
import { hasPendingTransaction, STATUS_POLL_INTERVAL_MS } from '@/lib/transactions/polling';

export function TransactionDetailView({
  transactionExternalId,
}: {
  transactionExternalId: string;
}) {
  const { state, reload, refreshQuietly } = useTransactionDetail(transactionExternalId);

  // Polling condicional: a antifraude responde fora do ciclo da requisicao, entao a tela so
  // tem o que perguntar enquanto esta transacao estiver pendente. Aprovada ou rejeitada, o
  // intervalo e desligado e nao volta.
  const awaitingResolution = state.kind === 'ready' && hasPendingTransaction([state.data]);

  usePolling(refreshQuietly, {
    active: awaitingResolution,
    intervalMs: STATUS_POLL_INTERVAL_MS,
  });

  return (
    <section aria-labelledby="detalhe-titulo" className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <InlineLink href="/" className="self-start text-sm">
          Voltar para a listagem
        </InlineLink>
        <h1 id="detalhe-titulo" className="text-2xl font-semibold tracking-tight text-ink">
          Detalhe da transacao
        </h1>
      </header>

      {/* A regiao viva existe desde o primeiro render, e nao so quando o status muda: um
          `role="status"` inserido junto com o texto costuma nao ser anunciado. */}
      <p role="status" className="sr-only">
        {state.kind === 'ready' ? `Status: ${statusText(state.data.transactionStatus.name)}` : ''}
      </p>

      {state.kind === 'loading' && (
        <StatusPanel icon={<Spinner />} title="Carregando a transacao..." />
      )}

      {state.kind === 'error' && (
        <StatusPanel
          role="alert"
          tone="critical"
          title={state.failure.title}
          description={state.failure.description}
          action={
            state.failure.retryable ? (
              <Button variant="critical" onClick={reload}>
                Tentar novamente
              </Button>
            ) : undefined
          }
        />
      )}

      {state.kind === 'ready' && (
        <div className="flex flex-col gap-3">
          <TransactionDetailCard transaction={state.data} />
          {awaitingResolution && (
            <p className="text-sm text-ink-muted">
              A antifraude ainda esta validando esta transacao. O status se atualiza sozinho nesta
              tela.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
