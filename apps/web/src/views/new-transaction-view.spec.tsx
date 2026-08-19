import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TransactionView } from '@challenge/contracts';

import { NewTransactionView } from '@/views/new-transaction-view';

const push = vi.fn();

// A navegacao depois do envio e comportamento da tela, mas o roteador do Next nao existe
// fora de uma rota montada: aqui ele so precisa registrar para onde foi mandado.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const CREATED: TransactionView = {
  transactionExternalId: '3f0b4c8e-9d1a-4a53-9c5f-2a7d0f6b1e42',
  transactionType: { name: 'Pagamento' },
  transactionStatus: { name: 'pending' },
  value: 1000.5,
  createdAt: '2026-08-18T12:00:00.000Z',
};

const DEBIT = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e72';
const CREDIT = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e73';

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Conta de debito'), { target: { value: DEBIT } });
  fireEvent.change(screen.getByLabelText('Conta de credito'), { target: { value: CREDIT } });
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '1000,50' } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /criar transacao/i }));
}

afterEach(() => {
  push.mockReset();
  vi.unstubAllGlobals();
});

describe('NewTransactionView', () => {
  it('envia o corpo no formato da api e abre o detalhe do que foi criado', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => CREATED });
    vi.stubGlobal('fetch', fetchMock);

    render(<NewTransactionView />);
    fillValidForm();
    submit();

    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith(`/transactions/${CREATED.transactionExternalId}`);
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];

    expect(String(url)).toBe('http://api.test/transactions');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      accountExternalIdDebit: DEBIT,
      accountExternalIdCredit: CREDIT,
      transferTypeId: 2,
      value: 1000.5,
    });
  });

  it('recusa o envio no cliente e aponta o campo errado', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<NewTransactionView />);
    fireEvent.change(screen.getByLabelText('Conta de debito'), { target: { value: 'conta-1' } });
    submit();

    // As duas contas erradas: uma pelo texto invalido, a outra por estar em branco.
    expect(screen.getAllByText('informe um identificador de conta valido')).toHaveLength(2);
    expect(screen.getByText('escolha o tipo de transferencia')).toBeTruthy();
    expect(screen.getByText('informe o valor da transacao')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/corrija os campos destacados/i);

    // O erro esta ligado ao campo, e nao solto no meio da pagina.
    const field = screen.getByLabelText('Conta de debito');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe('conta-debito-erro');

    // Nada de ida a API por um corpo que a propria tela ja sabe que seria recusado.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('da nome proprio a cada botao de gerar identificador', async () => {
    vi.stubGlobal('fetch', vi.fn());

    render(<NewTransactionView />);

    // Dois botoes chamados so "Gerar" seriam indistinguiveis para quem navega pela lista de
    // controles do leitor de tela.
    const debit = await screen.findByRole('button', {
      name: /gerar identificador da conta de debito/i,
    });

    fireEvent.click(debit);
    expect(
      screen.getByRole('button', { name: /gerar identificador da conta de credito/i }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Conta de debito')).toHaveProperty(
      'value',
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
    );
  });

  it('tira o erro do campo assim que ele e corrigido', () => {
    vi.stubGlobal('fetch', vi.fn());

    render(<NewTransactionView />);
    submit();

    expect(screen.getByText('informe o valor da transacao')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '10' } });

    expect(screen.queryByText('informe o valor da transacao')).toBeNull();
  });

  it('mostra a falha da api e devolve o formulario para quem estava preenchendo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<NewTransactionView />);
    fillValidForm();
    submit();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/nao foi possivel falar com a api/i);

    // O botao volta a aceitar clique, e o que foi digitado continua la.
    expect(screen.getByRole('button', { name: /criar transacao/i })).toHaveProperty(
      'disabled',
      false,
    );
    expect(screen.getByLabelText('Conta de debito')).toHaveProperty('value', DEBIT);
    expect(push).not.toHaveBeenCalled();
  });

  it('desabilita o envio enquanto a requisicao nao volta', async () => {
    let settle = (_response: unknown) => {};
    const pending = new Promise((resolve) => {
      settle = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));

    render(<NewTransactionView />);
    fillValidForm();
    submit();

    // Um segundo clique criaria uma segunda transacao: o POST nao e idempotente.
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /enviando/i })).toHaveProperty('disabled', true);
    });

    settle({ ok: true, status: 201, json: async () => CREATED });

    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledTimes(1);
    });
  });
});
