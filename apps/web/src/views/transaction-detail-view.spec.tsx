import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TransactionView } from '@challenge/contracts';

import { STATUS_POLL_INTERVAL_MS } from '@/lib/transactions/polling';
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

  // A ultima resposta se repete: o polling pergunta de novo, e sem isso a volta seguinte
  // cairia num `undefined` que nada tem a ver com o comportamento sob teste.
  const last = responses.at(-1);

  if (last !== undefined && !(last instanceof Error) && !('status' in last)) {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => last });
  }

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

/**
 * Deixa a leitura corrente terminar sem mover o relogio. `advanceTimersByTime` com um valor
 * grande adiantaria o intervalo do polling junto, e o teste passaria a medir uma volta que
 * nunca aconteceu.
 */
async function settleRead(): Promise<void> {
  for (let step = 0; step < 20; step += 1) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

afterEach(() => {
  vi.useRealTimers();
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

  it('reflete a mudanca de status sem o usuario pedir, e para de perguntar depois dela', async () => {
    vi.useFakeTimers();

    const fetchMock = stubFetch(transactionWith('pending'), transactionWith('approved'));

    render(<TransactionDetailView transactionExternalId={TRANSACTION_ID} />);

    await settleRead();
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A antifraude respondeu entre uma volta e outra: a tela descobre sozinha.
    await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS);

    expect(screen.getByText('Aprovada')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Status: Aprovada');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Aprovada e estado final: continuar perguntando repetiria a mesma resposta para sempre.
    await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('nao pergunta de novo quando a transacao ja nasce resolvida', async () => {
    vi.useFakeTimers();

    const fetchMock = stubFetch(transactionWith('rejected'));

    render(<TransactionDetailView transactionExternalId={TRANSACTION_ID} />);

    await settleRead();
    await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS * 3);

    expect(screen.getByText('Rejeitada')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('nao empilha requisicao quando a volta anterior ainda nao respondeu', async () => {
    vi.useFakeTimers();

    const fetchMock = stubFetch(transactionWith('pending'));
    // A partir daqui a API para de responder: sem trava, cada volta do intervalo abriria
    // mais uma requisicao, e quem resolvesse por ultimo venceria — nao quem perguntou por
    // ultimo.
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<TransactionDetailView transactionExternalId={TRANSACTION_ID} />);
    await settleRead();

    await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS * 3);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('assume a falha quando o polling erra varias voltas seguidas', async () => {
    vi.useFakeTimers();

    const fetchMock = stubFetch(transactionWith('pending'));
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<TransactionDetailView transactionExternalId={TRANSACTION_ID} />);
    await settleRead();

    // Uma volta que falha e oscilacao de rede: a tela continua mostrando o que tinha.
    await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS);
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();

    // Tres seguidas nao sao: o dado na tela envelheceu e quem le precisa saber.
    await vi.advanceTimersByTimeAsync(STATUS_POLL_INTERVAL_MS * 2);
    await settleRead();
    expect(screen.getByRole('alert').textContent).toMatch(/nao foi possivel carregar a transacao/i);
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
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
