import type { TransactionStatusUpdatedEvent } from '@challenge/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApplyTransactionResolution } from './apply-transaction-resolution.service';
import type {
  StatusUpdateOutcome,
  TransactionResolutionUpdate,
  TransactionStatusName,
  TransactionStatusStore,
} from './transaction.types';

const TRANSACTION_ID = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71';
const EVENT_ID = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6eaa';

/**
 * Reproduz as duas camadas do adaptador Prisma: o unique de [transactionId, eventId] e o
 * compare-and-set a partir de PENDING. Sem isso o teste afirmaria apenas que o servico
 * chama a porta, e nao que evento repetido ou tardio nao muda nada.
 */
class InMemoryTransactionStatusStore implements TransactionStatusStore {
  readonly history: TransactionResolutionUpdate[] = [];

  constructor(private readonly statuses: Map<string, TransactionStatusName>) {}

  statusOf(transactionExternalId: string): TransactionStatusName | undefined {
    return this.statuses.get(transactionExternalId);
  }

  applyResolution(update: TransactionResolutionUpdate): Promise<StatusUpdateOutcome> {
    const alreadySeen = this.history.some(
      (recorded) =>
        recorded.transactionExternalId === update.transactionExternalId &&
        recorded.eventId === update.eventId,
    );

    if (alreadySeen) {
      return Promise.resolve('duplicated');
    }

    const current = this.statuses.get(update.transactionExternalId);

    if (current === undefined) {
      return Promise.resolve('unknown-transaction');
    }

    this.history.push(update);

    if (current !== 'PENDING') {
      return Promise.resolve('ignored');
    }

    this.statuses.set(update.transactionExternalId, update.toStatus);

    return Promise.resolve('applied');
  }
}

function resolutionEvent(
  overrides: Partial<TransactionStatusUpdatedEvent['data']> & { eventId?: string } = {},
): TransactionStatusUpdatedEvent {
  const { eventId, ...data } = overrides;

  return {
    eventId: eventId ?? EVENT_ID,
    eventType: 'transaction.status.updated',
    version: 1,
    occurredAt: '2026-08-18T12:00:03.000Z',
    correlationId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e70',
    data: {
      transactionExternalId: TRANSACTION_ID,
      status: 'APPROVED',
      reason: 'value_within_limit',
      ...data,
    },
  };
}

describe('ApplyTransactionResolution', () => {
  let store: InMemoryTransactionStatusStore;
  let applyResolution: ApplyTransactionResolution;

  beforeEach(() => {
    store = new InMemoryTransactionStatusStore(new Map([[TRANSACTION_ID, 'PENDING']]));
    applyResolution = new ApplyTransactionResolution(store);
  });

  it('aplica o resultado sobre uma transacao pendente', async () => {
    const outcome = await applyResolution.execute(resolutionEvent());

    expect(outcome).toBe('applied');
    expect(store.statusOf(TRANSACTION_ID)).toBe('APPROVED');
    expect(store.history).toHaveLength(1);
  });

  it('registra a hora do fato do evento no historico', async () => {
    await applyResolution.execute(resolutionEvent());

    expect(store.history[0]?.occurredAt).toEqual(new Date('2026-08-18T12:00:03.000Z'));
  });

  it('nao muda nada quando o mesmo evento chega duas vezes', async () => {
    const event = resolutionEvent();

    await applyResolution.execute(event);
    const outcome = await applyResolution.execute(event);

    expect(outcome).toBe('duplicated');
    expect(store.statusOf(TRANSACTION_ID)).toBe('APPROVED');
    expect(store.history).toHaveLength(1);
  });

  it('ignora um evento novo para uma transacao ja finalizada', async () => {
    await applyResolution.execute(resolutionEvent());

    const outcome = await applyResolution.execute(
      resolutionEvent({ eventId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6ebb', status: 'REJECTED' }),
    );

    expect(outcome).toBe('ignored');
    expect(store.statusOf(TRANSACTION_ID)).toBe('APPROVED');
  });

  it('rejeita a transacao quando o resultado e de rejeicao', async () => {
    const outcome = await applyResolution.execute(
      resolutionEvent({ status: 'REJECTED', reason: 'value_above_limit' }),
    );

    expect(outcome).toBe('applied');
    expect(store.statusOf(TRANSACTION_ID)).toBe('REJECTED');
  });

  it('reconhece resultado de transacao que nao existe no banco', async () => {
    const outcome = await applyResolution.execute(
      resolutionEvent({ transactionExternalId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6eff' }),
    );

    expect(outcome).toBe('unknown-transaction');
    expect(store.history).toHaveLength(0);
  });
});
