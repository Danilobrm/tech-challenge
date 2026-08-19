import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PageMetadata } from '@challenge/contracts';

import { TransactionsPagination } from '@/components/transactions/transactions-pagination';

function pagination(overrides: Partial<PageMetadata> = {}): PageMetadata {
  return { page: 2, pageSize: 20, total: 45, totalPages: 3, ...overrides };
}

describe('TransactionsPagination', () => {
  it('diz em que ponto da lista o usuario esta', () => {
    render(
      <TransactionsPagination pagination={pagination()} maxPage={1000} onGoToPage={vi.fn()} />,
    );

    expect(screen.getByRole('navigation', { name: /paginacao/i }).textContent).toContain(
      'Pagina 2 de 3',
    );
  });

  it('avanca e volta uma pagina por vez', () => {
    const onGoToPage = vi.fn();

    render(
      <TransactionsPagination pagination={pagination()} maxPage={1000} onGoToPage={onGoToPage} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /proxima pagina/i }));
    fireEvent.click(screen.getByRole('button', { name: /pagina anterior/i }));

    expect(onGoToPage.mock.calls).toEqual([[3], [1]]);
  });

  it('nao deixa voltar antes da primeira pagina', () => {
    render(
      <TransactionsPagination
        pagination={pagination({ page: 1 })}
        maxPage={1000}
        onGoToPage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /pagina anterior/i })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('nao deixa pedir pagina que a api recusaria', () => {
    render(
      <TransactionsPagination
        pagination={pagination({ page: 5, totalPages: 40 })}
        maxPage={5}
        onGoToPage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /proxima pagina/i })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('nao deixa passar da ultima pagina', () => {
    render(
      <TransactionsPagination
        pagination={pagination({ page: 3 })}
        maxPage={1000}
        onGoToPage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /proxima pagina/i })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
