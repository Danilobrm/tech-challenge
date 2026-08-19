import { describe, expect, it } from 'vitest';

import type { PersistedTransaction } from '../domain/transaction';
import { toTransactionView } from './transaction.presenter';

const stored: PersistedTransaction = {
  transactionExternalId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71',
  transferTypeName: 'Transferência entre contas',
  status: 'PENDING',
  value: '120.00',
  createdAt: new Date('2026-08-18T12:00:00.000Z'),
};

describe('toTransactionView', () => {
  it('devolve exatamente os campos do contrato de leitura', () => {
    expect(toTransactionView(stored)).toEqual({
      transactionExternalId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71',
      transactionType: { name: 'Transferência entre contas' },
      transactionStatus: { name: 'pending' },
      value: 120,
      createdAt: '2026-08-18T12:00:00.000Z',
    });
  });

  it('expoe o status no mesmo vocabulario que o filtro da listagem aceita', () => {
    expect(toTransactionView({ ...stored, status: 'REJECTED' }).transactionStatus).toEqual({
      name: 'rejected',
    });
  });
});
