'use client';

import { Spinner } from '@/components/ui/spinner';
import { StatusPanel } from '@/components/ui/status-panel';
import { TransactionsTable } from '@/components/transactions/transactions-table';
import { Button } from '@/components/ui/button';
import { useTransactionsList } from '@/hooks/use-transactions-list';
import { EMPTY_FILTERS } from '@/lib/transactions/list-params';

export function TransactionsView() {
  const { state, reload } = useTransactionsList(EMPTY_FILTERS, 1);

  const busy = state.kind === 'loading' || (state.kind === 'ready' && state.refreshing);

  return (
    <section aria-labelledby="listagem-titulo" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 id="listagem-titulo" className="text-2xl font-semibold tracking-tight text-ink">
          Transacoes
        </h1>
        <p className="text-sm text-ink-muted">
          Toda transacao nasce pendente e muda de status quando a antifraude responde.
        </p>
      </header>

      {/* A regiao viva existe desde o primeiro render, e nao so quando a busca comeca: um
          `role="status"` inserido junto com o texto costuma nao ser anunciado. */}
      <p role="status" className="sr-only">
        {busy ? 'Carregando transacoes' : ''}
      </p>

      {state.kind === 'loading' && (
        <StatusPanel icon={<Spinner />} title="Carregando transacoes..." />
      )}

      {state.kind === 'error' && (
        <StatusPanel
          role="alert"
          tone="critical"
          title="Nao foi possivel carregar a listagem"
          description={state.message}
          action={
            <Button variant="critical" onClick={reload}>
              Tentar novamente
            </Button>
          }
        />
      )}

      {state.kind === 'ready' && state.page.items.length === 0 && (
        <StatusPanel
          title="Nenhuma transacao foi criada ainda"
          description="Assim que a primeira transacao for criada, ela aparece aqui."
        />
      )}

      {state.kind === 'ready' && state.page.items.length > 0 && (
        // A tabela continua montada durante o refetch, apenas marcada como ocupada: trocar
        // por um painel de espera tiraria o foco do botao que disparou a busca.
        <div aria-busy={state.refreshing} className={state.refreshing ? 'opacity-60' : undefined}>
          <TransactionsTable items={state.page.items} />
        </div>
      )}
    </section>
  );
}
