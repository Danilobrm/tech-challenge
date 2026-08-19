import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ListTransactionsResponse } from '@challenge/contracts';

import { TransactionsView } from '@/views/transactions-view';

const transaction: ListTransactionsResponse['items'][number] = {
  transactionExternalId: '3f0b4c8e-9d1a-4a53-9c5f-2a7d0f6b1e42',
  transactionType: { name: 'Pagamento' },
  transactionStatus: { name: 'pending' },
  value: 1000,
  createdAt: '2026-08-18T12:00:00.000Z',
};

function pageWith(
  items: ListTransactionsResponse['items'],
  pagination: Partial<ListTransactionsResponse['pagination']> = {},
): ListTransactionsResponse {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      total: items.length,
      totalPages: items.length === 0 ? 0 : 1,
      ...pagination,
    },
  };
}

/** Dobra da camada de fetch: a API nao sobe em teste, o que esta sob teste e a tela. */
function stubFetch(...responses: Array<ListTransactionsResponse | Error>) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    if (response instanceof Error) {
      fetchMock.mockRejectedValueOnce(response);
      continue;
    }

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => response });
  }

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TransactionsView', () => {
  it('anuncia o carregamento antes da resposta chegar', async () => {
    stubFetch(pageWith([transaction]));

    render(<TransactionsView />);

    expect(screen.getByRole('status').textContent).toMatch(/carregando/i);

    await screen.findByRole('table');
  });

  it('mostra a falha e busca de novo quando o usuario pede', async () => {
    const fetchMock = stubFetch(new TypeError('Failed to fetch'), pageWith([transaction]));

    render(<TransactionsView />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/nao foi possivel falar com a api/i);

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('avisa que nao ha transacao nenhuma quando a lista volta vazia', async () => {
    stubFetch(pageWith([]));

    render(<TransactionsView />);

    expect(await screen.findByText(/nenhuma transacao foi criada ainda/i)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
