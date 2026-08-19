'use client';

import type { PageMetadata } from '@challenge/contracts';

import { Button } from '@/components/ui/button';

interface TransactionsPaginationProps {
  pagination: PageMetadata;
  /**
   * Teto que a API aceita no parametro `page`. Sem ele, uma lista com mais paginas do que o
   * limite deixaria o botao ativo para uma pagina que so volta como 400.
   */
  maxPage: number;
  onGoToPage: (page: number) => void;
}

export function TransactionsPagination({
  pagination,
  maxPage,
  onGoToPage,
}: TransactionsPaginationProps) {
  const { page, total, totalPages } = pagination;
  const lastReachablePage = Math.min(totalPages, maxPage);

  return (
    <nav
      aria-label="Paginacao"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-ink-muted tabular-nums">
        Pagina {page} de {totalPages} — {total} {total === 1 ? 'transacao' : 'transacoes'}
      </p>

      <div className="flex gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => {
            onGoToPage(page - 1);
          }}
        >
          Pagina anterior
        </Button>
        <Button
          disabled={page >= lastReachablePage}
          onClick={() => {
            onGoToPage(page + 1);
          }}
        >
          Proxima pagina
        </Button>
      </div>
    </nav>
  );
}
