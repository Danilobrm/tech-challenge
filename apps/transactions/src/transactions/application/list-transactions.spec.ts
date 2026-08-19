import { listTransactionsQuerySchema } from '@challenge/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
  PersistedTransaction,
  TransactionPage,
  TransactionPageQuery,
} from '../domain/transaction';
import type { TransactionReader } from '../domain/transaction.ports';
import { ListTransactions } from './list-transactions';

const CREATED_AT = new Date('2026-08-18T12:00:00.000Z');

function transaction(overrides: Partial<PersistedTransaction> = {}): PersistedTransaction {
  return {
    transactionExternalId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71',
    transferTypeName: 'Transferência entre contas',
    status: 'APPROVED',
    value: '120.00',
    createdAt: CREATED_AT,
    ...overrides,
  };
}

/**
 * Dobra do banco: nao filtra nada, so registra a consulta que recebeu. O que importa no
 * caso de uso e qual consulta ele monta — filtrar de verdade e trabalho do Postgres.
 */
class FakeReader implements TransactionReader {
  received: TransactionPageQuery | undefined;

  constructor(private readonly page: TransactionPage) {}

  findById(): Promise<PersistedTransaction | null> {
    throw new Error('a listagem nao consulta por id');
  }

  list(query: TransactionPageQuery): Promise<TransactionPage> {
    this.received = query;

    return Promise.resolve(this.page);
  }
}

describe('ListTransactions', () => {
  let reader: FakeReader;
  let listTransactions: ListTransactions;

  beforeEach(() => {
    reader = new FakeReader({ items: [transaction()], total: 1 });
    listTransactions = new ListTransactions(reader);
  });

  it('traduz o filtro de status do vocabulario publico para o do banco', async () => {
    await listTransactions.execute(listTransactionsQuerySchema.parse({ status: 'pending' }));

    expect(reader.received?.filters.status).toBe('PENDING');
  });

  it('leva o periodo como fronteiras de data da consulta', async () => {
    await listTransactions.execute(
      listTransactionsQuerySchema.parse({
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
      }),
    );

    expect(reader.received?.filters).toMatchObject({
      createdFrom: new Date('2026-08-01T00:00:00.000Z'),
      createdTo: new Date('2026-08-31T23:59:59.999Z'),
    });
  });

  it('nao filtra nada quando a query so pede a pagina', async () => {
    await listTransactions.execute(listTransactionsQuerySchema.parse({}));

    expect(reader.received?.filters).toEqual({
      status: undefined,
      transferTypeId: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    });
  });

  it('converte a pagina pedida em deslocamento', async () => {
    await listTransactions.execute(listTransactionsQuerySchema.parse({ page: 3, pageSize: 20 }));

    expect(reader.received).toMatchObject({ skip: 40, take: 20 });
  });

  it('devolve os itens com os metadados de paginacao', async () => {
    reader = new FakeReader({ items: [transaction()], total: 41 });
    listTransactions = new ListTransactions(reader);

    const page = await listTransactions.execute(
      listTransactionsQuerySchema.parse({ page: 3, pageSize: 20 }),
    );

    expect(page.pagination).toEqual({ page: 3, pageSize: 20, total: 41, totalPages: 3 });
    expect(page.items).toHaveLength(1);
  });

  it('devolve pagina vazia sem inventar pagina quando nada casa com o filtro', async () => {
    reader = new FakeReader({ items: [], total: 0 });
    listTransactions = new ListTransactions(reader);

    const page = await listTransactions.execute(
      listTransactionsQuerySchema.parse({ status: 'rejected' }),
    );

    expect(page.items).toEqual([]);
    expect(page.pagination).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });
});
