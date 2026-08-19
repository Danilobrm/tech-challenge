import { describe, expect, it } from 'vitest';
import type { TransactionView } from '@challenge/contracts';

import { hasPendingTransaction } from '@/lib/transactions/polling';

function transactionWith(name: TransactionView['transactionStatus']['name']): TransactionView {
  return {
    transactionExternalId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e72',
    transactionType: { name: 'Pagamento' },
    transactionStatus: { name },
    value: 100,
    createdAt: '2026-08-18T12:00:00.000Z',
  };
}

describe('hasPendingTransaction', () => {
  it('reconhece que ainda ha o que esperar', () => {
    expect(hasPendingTransaction([transactionWith('approved'), transactionWith('pending')])).toBe(
      true,
    );
  });

  it('nao encontra nada por resolver quando todas ja tem status final', () => {
    expect(hasPendingTransaction([transactionWith('approved'), transactionWith('rejected')])).toBe(
      false,
    );
  });

  it('trata lista vazia como nada a esperar', () => {
    expect(hasPendingTransaction([])).toBe(false);
  });
});
