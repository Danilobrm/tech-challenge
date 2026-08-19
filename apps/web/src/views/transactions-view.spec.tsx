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

function queryOf(fetchMock: ReturnType<typeof vi.fn>, call: number): URLSearchParams {
  return new URL(String(fetchMock.mock.calls[call]?.[0])).searchParams;
}

/** A busca corrente terminou quando o formulario volta a aceitar outra. */
function waitUntilIdle(): Promise<void> {
  return vi.waitFor(() => {
    expect(screen.getByRole('button', { name: /aplicar filtros/i })).toHaveProperty(
      'disabled',
      false,
    );
  });
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

  it('distingue lista vazia por filtro e oferece a saida', async () => {
    const fetchMock = stubFetch(pageWith([transaction]), pageWith([]), pageWith([transaction]));

    render(<TransactionsView />);
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'rejected' } });
    fireEvent.click(screen.getByRole('button', { name: /aplicar filtros/i }));

    expect(
      await screen.findByText(/nenhuma transacao encontrada para esses filtros/i),
    ).toBeTruthy();
    expect(queryOf(fetchMock, 1).get('status')).toBe('rejected');

    fireEvent.click(screen.getByRole('button', { name: /mostrar todas as transacoes/i }));

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(queryOf(fetchMock, 2).get('status')).toBeNull();
  });

  it('desfaz o filtro aplicado mesmo com os campos ja limpos', async () => {
    const fetchMock = stubFetch(
      pageWith([transaction]),
      pageWith([transaction]),
      pageWith([transaction]),
    );

    render(<TransactionsView />);
    await screen.findByRole('table');

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /aplicar filtros/i }));
    await waitUntilIdle();

    // Campo de volta em "Todos", mas a lista na tela continua filtrada.
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));

    await waitUntilIdle();
    expect(queryOf(fetchMock, 2).get('transferTypeId')).toBeNull();
  });

  it('mantem a tabela na tela enquanto busca a pagina seguinte', async () => {
    stubFetch(
      pageWith([transaction], { page: 1, total: 25, totalPages: 2 }),
      pageWith([transaction], { page: 2, total: 25, totalPages: 2 }),
    );

    render(<TransactionsView />);
    const table = await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: /proxima pagina/i }));

    // Desmontar a tabela durante o refetch jogaria o foco do teclado para fora do botao
    // que acabou de ser clicado.
    expect(screen.getByRole('table')).toBe(table);
    expect(screen.getByRole('button', { name: /proxima pagina/i })).toBeTruthy();

    await waitUntilIdle();
  });

  it('oferece a volta quando a pagina aberta deixou de existir', async () => {
    const fetchMock = stubFetch(
      pageWith([transaction], { page: 1, total: 25, totalPages: 2 }),
      pageWith([], { page: 2, total: 1, totalPages: 1 }),
      pageWith([transaction], { page: 1, total: 1, totalPages: 1 }),
    );

    render(<TransactionsView />);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: /proxima pagina/i }));

    expect(await screen.findByText(/esta pagina esta vazia/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /voltar para a primeira pagina/i }));

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(queryOf(fetchMock, 2).get('page')).toBe('1');
  });

  it('busca a pagina seguinte sem perder o filtro aplicado', async () => {
    const fetchMock = stubFetch(
      pageWith([transaction], { page: 1, total: 25, totalPages: 2 }),
      pageWith([transaction], { page: 2, total: 25, totalPages: 2 }),
      pageWith([transaction], { page: 1, total: 3, totalPages: 1 }),
    );

    render(<TransactionsView />);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: /proxima pagina/i }));

    // Enquanto a pagina dois nao chega o formulario fica ocupado, e o clique seguinte
    // cairia no vazio.
    await waitUntilIdle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queryOf(fetchMock, 1).get('page')).toBe('2');

    // Filtro novo encurta a lista: continuar na pagina dois devolveria vazio sem motivo.
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /aplicar filtros/i }));

    await waitUntilIdle();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(queryOf(fetchMock, 2).get('page')).toBe('1');
    expect(queryOf(fetchMock, 2).get('transferTypeId')).toBe('2');
  });
});
