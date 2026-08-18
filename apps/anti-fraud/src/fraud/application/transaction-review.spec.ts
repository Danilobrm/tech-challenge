import { transactionStatusUpdatedEventSchema } from '@challenge/contracts';
import type { TransactionCreatedEvent } from '@challenge/contracts';
import { describe, expect, it } from 'vitest';

import type { Clock } from '@challenge/messaging';
import { UuidV5IdGenerator } from '@challenge/messaging';
import { TransactionFraudRule } from '../domain/fraud-rule';
import { TransactionReview } from './transaction-review';

const DECIDED_AT = new Date('2026-08-18T12:00:03.000Z');
const ID_NAMESPACE = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e00';
const CORRELATION_ID = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e70';
const TRANSACTION_ID = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71';

function createdEvent(value: string): TransactionCreatedEvent {
  return {
    eventId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e01',
    eventType: 'transaction.created',
    version: 1,
    occurredAt: '2026-08-18T12:00:00.000Z',
    correlationId: CORRELATION_ID,
    data: {
      transactionExternalId: TRANSACTION_ID,
      accountExternalIdDebit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e72',
      accountExternalIdCredit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e73',
      transferTypeId: 1,
      value,
    },
  };
}

function buildReview(): TransactionReview {
  const clock: Clock = { now: () => DECIDED_AT };
  // Gerador real, e nao um dublê: o que esta sob teste e a estabilidade do id entre
  // instancias, que so aparece com a derivacao de verdade.
  const ids = new UuidV5IdGenerator(ID_NAMESPACE);

  return new TransactionReview(new TransactionFraudRule(), clock, ids);
}

describe('TransactionReview', () => {
  it('publica aprovacao para o valor exato do limite', () => {
    const result = buildReview().review(createdEvent('1000.00'));

    expect(result.data).toEqual({
      transactionExternalId: TRANSACTION_ID,
      status: 'APPROVED',
      reason: 'value_within_limit',
    });
  });

  it('publica rejeicao um centavo acima do limite', () => {
    const result = buildReview().review(createdEvent('1000.01'));

    expect(result.data).toEqual({
      transactionExternalId: TRANSACTION_ID,
      status: 'REJECTED',
      reason: 'value_above_limit',
    });
  });

  it('propaga a correlacao do evento de origem', () => {
    const result = buildReview().review(createdEvent('120.00'));

    expect(result.correlationId).toBe(CORRELATION_ID);
  });

  it('tem identidade propria, separada da criacao que a originou', () => {
    const created = createdEvent('120.00');
    const result = buildReview().review(created);

    expect(result.eventId).not.toBe(created.eventId);
  });

  it('repete a mesma identidade quando a criacao e reentregue', () => {
    const created = createdEvent('120.00');

    // Reentrega do mesmo evento por instancias diferentes: id igual e o que faz a
    // deduplicacao do consumidor enxergar repeticao em vez de um segundo resultado.
    expect(buildReview().review(created).eventId).toBe(buildReview().review(created).eventId);
  });

  it('registra a hora da decisao, e nao a da criacao', () => {
    const result = buildReview().review(createdEvent('120.00'));

    expect(result.occurredAt).toBe(DECIDED_AT.toISOString());
  });

  it('produz um evento que satisfaz o contrato do consumidor', () => {
    const result = buildReview().review(createdEvent('120.00'));

    expect(transactionStatusUpdatedEventSchema.safeParse(result).success).toBe(true);
  });
});
