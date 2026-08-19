import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TransactionView } from '@challenge/contracts';

import { TransactionsTable } from '@/components/transactions/transactions-table';

const transaction: TransactionView = {
  transactionExternalId: '3f0b4c8e-9d1a-4a53-9c5f-2a7d0f6b1e42',
  transactionType: { name: 'Pagamento' },
  transactionStatus: { name: 'pending' },
  value: 1000,
  createdAt: '2026-08-18T12:00:00.000Z',
};

describe('TransactionsTable', () => {
  it('usa tabela de verdade, com cabecalho de coluna', () => {
    render(<TransactionsTable items={[transaction]} />);

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Identificador',
      'Tipo',
      'Status',
      'Valor',
      'Criada em',
    ]);
  });

  it('da nome a linha pelo identificador da transacao', () => {
    render(<TransactionsTable items={[transaction]} />);

    expect(screen.getByRole('rowheader').textContent).toBe(transaction.transactionExternalId);
  });

  it('mostra uma linha por transacao, alem da linha de cabecalho', () => {
    render(
      <TransactionsTable
        items={[transaction, { ...transaction, transactionExternalId: crypto.randomUUID() }]}
      />,
    );

    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('traduz o status e formata o valor para quem le', () => {
    render(<TransactionsTable items={[transaction]} />);

    const row = screen.getByRole('rowheader').closest('tr');

    expect(row?.textContent).toContain('Pendente');
    expect(row?.textContent).toContain('1.000,00');
  });
});
