import { transactionCreatedEventSchema } from '@challenge/contracts';
import type { CreateTransactionInput } from '@challenge/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Clock, IdGenerator } from '@challenge/messaging';
import { CreateTransaction } from './create-transaction.service';
import type {
  NewPendingTransaction,
  OutboxMessageDraft,
  PersistedTransaction,
  PendingTransactionWriter,
} from './transaction.types';

const CREATED_AT = new Date('2026-08-18T12:00:00.000Z');
const TRANSACTION_ID = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71';

/**
 * Dobra do banco: guarda o que foi gravado e chama o construtor do evento com o id que o
 * insert teria gerado, exatamente como o adaptador Prisma faz dentro da transacao.
 */
class FakeWriter implements PendingTransactionWriter {
  saved: NewPendingTransaction | undefined;
  outbox: OutboxMessageDraft | undefined;

  savePending(
    transaction: NewPendingTransaction,
    describeCreation: (transactionExternalId: string) => OutboxMessageDraft,
  ): Promise<PersistedTransaction> {
    this.saved = transaction;
    this.outbox = describeCreation(TRANSACTION_ID);

    return Promise.resolve({
      transactionExternalId: TRANSACTION_ID,
      transferTypeName: 'Transferência entre contas',
      status: 'PENDING',
      value: transaction.value,
      createdAt: transaction.createdAt,
    });
  }
}

class FixedClock implements Clock {
  now(): Date {
    return CREATED_AT;
  }
}

class SequentialIds implements IdGenerator {
  private count = 0;

  next(): string {
    this.count += 1;

    return `0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e0${this.count}`;
  }
}

const input: CreateTransactionInput = {
  accountExternalIdDebit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e72',
  accountExternalIdCredit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e73',
  transferTypeId: 1,
  value: 120,
};

describe('CreateTransaction', () => {
  let writer: FakeWriter;
  let createTransaction: CreateTransaction;

  beforeEach(() => {
    writer = new FakeWriter();
    createTransaction = new CreateTransaction(writer, new FixedClock(), new SequentialIds());
  });

  it('grava a transacao como pendente, com o valor no formato exato', async () => {
    const created = await createTransaction.execute(input);

    expect(writer.saved).toEqual({
      accountExternalIdDebit: input.accountExternalIdDebit,
      accountExternalIdCredit: input.accountExternalIdCredit,
      transferTypeId: 1,
      value: '120.00',
      createdAt: CREATED_AT,
    });
    expect(created.status).toBe('PENDING');
  });

  it('descreve o evento de criacao na mesma escrita da transacao', async () => {
    await createTransaction.execute(input);

    expect(writer.outbox).toMatchObject({
      aggregateType: 'transaction',
      aggregateId: TRANSACTION_ID,
      eventType: 'transaction.created',
      occurredAt: CREATED_AT,
    });
  });

  it('publica um payload que satisfaz o contrato do consumidor', async () => {
    await createTransaction.execute(input);

    const event = transactionCreatedEventSchema.parse(writer.outbox?.payload);

    expect(event.data).toEqual({
      transactionExternalId: TRANSACTION_ID,
      accountExternalIdDebit: input.accountExternalIdDebit,
      accountExternalIdCredit: input.accountExternalIdCredit,
      transferTypeId: 1,
      value: '120.00',
    });
  });

  it('usa a chave de particao do agregado para manter a ordem por transacao', async () => {
    await createTransaction.execute(input);

    expect(writer.outbox?.aggregateId).toBe(TRANSACTION_ID);
  });

  it('registra a hora do fato, e nao a hora da publicacao', async () => {
    await createTransaction.execute(input);

    const event = transactionCreatedEventSchema.parse(writer.outbox?.payload);

    expect(event.occurredAt).toBe(CREATED_AT.toISOString());
  });

  it('gera eventId e correlationId distintos', async () => {
    await createTransaction.execute(input);

    const event = transactionCreatedEventSchema.parse(writer.outbox?.payload);

    expect(event.eventId).not.toBe(event.correlationId);
  });
});
