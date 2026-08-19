'use client';

import { useState } from 'react';
import { MAX_PAGE } from '@challenge/contracts';

import { TransactionsFiltersForm } from '@/components/transactions/transactions-filters-form';
import { TransactionsPagination } from '@/components/transactions/transactions-pagination';
import { TransactionsTable } from '@/components/transactions/transactions-table';
import { ActionLink } from '@/components/ui/action-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { StatusPanel } from '@/components/ui/status-panel';
import { useTransactionsList } from '@/hooks/use-transactions-list';
import { EMPTY_FILTERS, hasActiveFilter } from '@/lib/transactions/list-params';
import type { TransactionFilters } from '@/lib/transactions/list-params';

export function TransactionsView() {
  // O rascunho e o que esta nos campos; o aplicado e o que a busca usa. Separar os dois faz
  // do "Aplicar filtros" um passo deliberado, em vez de uma requisicao por tecla digitada.
  const [draft, setDraft] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { state, reload } = useTransactionsList(applied, page);

  function apply(filters: TransactionFilters) {
    setDraft(filters);
    setApplied(filters);
    // Filtro novo encurta a lista: a pagina sete do resultado anterior costuma nao existir
    // no novo, e voltaria vazia sem que o usuario tenha feito nada de errado.
    setPage(1);
  }

  const busy = state.kind === 'loading' || (state.kind === 'ready' && state.refreshing);

  return (
    <section aria-labelledby="listagem-titulo" className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 id="listagem-titulo" className="text-2xl font-semibold tracking-tight text-ink">
            Transacoes
          </h1>
          <p className="text-sm text-ink-muted">
            Toda transacao nasce pendente e muda de status quando a antifraude responde.
          </p>
        </div>
        <ActionLink href="/transactions/nova" variant="primary">
          Nova transacao
        </ActionLink>
      </header>

      <TransactionsFiltersForm
        value={draft}
        onChange={setDraft}
        onApply={() => {
          apply(draft);
        }}
        onClear={() => {
          apply(EMPTY_FILTERS);
        }}
        // Limpar continua disponivel enquanto a lista na tela estiver filtrada, mesmo que os
        // campos ja tenham voltado ao vazio: e o que desfaz o filtro aplicado.
        canClear={hasActiveFilter(draft) || hasActiveFilter(applied)}
        busy={busy}
      />

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
          description={state.failure}
          action={
            <Button variant="critical" onClick={reload}>
              Tentar novamente
            </Button>
          }
        />
      )}

      {state.kind === 'ready' && state.data.items.length === 0 && page > 1 && (
        <StatusPanel
          title="Esta pagina esta vazia"
          description="A lista encurtou desde a ultima busca e esta pagina deixou de existir."
          action={
            <Button
              onClick={() => {
                setPage(1);
              }}
            >
              Voltar para a primeira pagina
            </Button>
          }
        />
      )}

      {state.kind === 'ready' && state.data.items.length === 0 && page === 1 && (
        <StatusPanel
          title={
            hasActiveFilter(applied)
              ? 'Nenhuma transacao encontrada para esses filtros'
              : 'Nenhuma transacao foi criada ainda'
          }
          description={
            hasActiveFilter(applied)
              ? 'Nenhum registro no periodo, status ou tipo escolhidos.'
              : 'Assim que a primeira transacao for criada, ela aparece aqui.'
          }
          {...(hasActiveFilter(applied)
            ? {
                action: (
                  <Button
                    onClick={() => {
                      apply(EMPTY_FILTERS);
                    }}
                  >
                    Mostrar todas as transacoes
                  </Button>
                ),
              }
            : {})}
        />
      )}

      {state.kind === 'ready' && state.data.items.length > 0 && (
        // A tabela continua montada durante o refetch, apenas marcada como ocupada: trocar
        // por um painel de espera tiraria o foco do botao que disparou a busca.
        <div aria-busy={state.refreshing} className={state.refreshing ? 'opacity-60' : undefined}>
          <div className="flex flex-col gap-4">
            <TransactionsTable items={state.data.items} />
            <TransactionsPagination
              pagination={state.data.pagination}
              maxPage={MAX_PAGE}
              onGoToPage={setPage}
            />
          </div>
        </div>
      )}
    </section>
  );
}
