import { beforeEach, describe, expect, it } from 'vitest';

import { TransactionNotFoundError } from '../domain/transaction';
import type { PersistedTransaction, TransactionPage } from '../domain/transaction';
import type { TransactionReader } from '../domain/transaction.ports';
import { FindTransaction } from './find-transaction';

const TRANSACTION_ID = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71';

const stored: PersistedTransaction = {
  transactionExternalId: TRANSACTION_ID,
  transferTypeName: 'Transferência entre contas',
  status: 'APPROVED',
  value: '120.00',
  createdAt: new Date('2026-08-18T12:00:00.000Z'),
};

/** Dobra do banco: guarda uma unica transacao e nao conhece nenhuma outra. */
class FakeReader implements TransactionReader {
  findById(transactionExternalId: string): Promise<PersistedTransaction | null> {
    return Promise.resolve(transactionExternalId === TRANSACTION_ID ? stored : null);
  }

  list(): Promise<TransactionPage> {
    throw new Error('a consulta por id nao lista');
  }
}

describe('FindTransaction', () => {
  let findTransaction: FindTransaction;

  beforeEach(() => {
    findTransaction = new FindTransaction(new FakeReader());
  });

  it('devolve a transacao gravada', async () => {
    await expect(findTransaction.execute(TRANSACTION_ID)).resolves.toEqual(stored);
  });

  it('recusa id inexistente com erro de dominio, e nao com ausencia silenciosa', async () => {
    await expect(
      findTransaction.execute('0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e99'),
    ).rejects.toBeInstanceOf(TransactionNotFoundError);
  });
});
