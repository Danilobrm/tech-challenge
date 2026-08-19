import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TransactionView } from '@challenge/contracts';

import { TransactionDetailView } from '@/views/transaction-detail-view';

const TRANSACTION_ID = '3f0b4c8e-9d1a-4a53-9c5f-2a7d0f6b1e42';

function transactionWith(name: TransactionView['transactionStatus']['name']): TransactionView {
  return {
    transactionExternalId: TRANSACTION_ID,
    transactionType: { name: 'Pagamento' },
    transactionStatus: { name },
    value: 500,
    createdAt: '2026-08-18T12:00:00.000Z',
  };
}

type StubbedResponse = TransactionView | Error | { status: number; message: string };

/** Dobra da camada de fetch: a API nao sobe em teste, o que esta sob teste e a tela. */
function stubFetch(...responses: StubbedResponse[]) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    if (response instanceof Error) {
      fetchMock.mockRejectedValueOnce(response);
      continue;
    }

    if ('status' in response) {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: response.status,
        json: async () => ({ message: response.message }),
      });
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

describe('TransactionDetailView', () => {
  it('mostra a transacao pedida', async () => {
    const fetchMock = stubFetch(transactionWith('approved'));

    render(<TransactionDetailView transactionExternalId={TRANSACTION_ID} />);

    expect(await screen.findByText('Aprovada')).toBeTruthy();
    expect(screen.getByText('Pagamento')).toBeTruthy();
    expect(screen.getByText('R$ 500,00')).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `http://api.test/transactions/${TRANSACTION_ID}`,
    );
  });

  it('nao oferece tentar de novo quando o identificador do endereco e invalido', async () => {
    stubFetch({ status: 400, message: 'requisicao invalida' });

    render(<TransactionDetailView transactionExternalId="nao-e-uuid" />);

    expect(await screen.findByText(/nao foi possivel abrir esta transacao/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).toBeNull();
  });

  it('mostra a falha e busca de novo quando o usuario pede', async () => {
    const fetchMock = stubFetch(new TypeError('Failed to fetch'), transactionWith('approved'));

    render(<TransactionDetailView transactionExternalId={TRANSACTION_ID} />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/nao foi possivel carregar a transacao/i);

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByText('Aprovada')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('nao oferece tentar de novo quando a transacao nao existe', async () => {
    stubFetch({ status: 404, message: 'transacao nao encontrada' });

    render(<TransactionDetailView transactionExternalId={TRANSACTION_ID} />);

    expect(await screen.findByText(/transacao nao encontrada/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).toBeNull();
  });
});
