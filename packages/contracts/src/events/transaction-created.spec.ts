import { describe, expect, it } from 'vitest';

import { transactionCreatedEventSchema } from './transaction-created';

const validEvent = {
  eventId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e7f',
  eventType: 'transaction.created',
  version: 1,
  occurredAt: '2026-08-18T12:00:00.000Z',
  correlationId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e70',
  data: {
    transactionExternalId: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e71',
    accountExternalIdDebit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e72',
    accountExternalIdCredit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e73',
    transferTypeId: 1,
    value: '1000.00',
  },
};

describe('transactionCreatedEventSchema', () => {
  it('aceita o evento completo', () => {
    expect(transactionCreatedEventSchema.parse(validEvent)).toEqual(validEvent);
  });

  it('recusa valor monetario sem as duas casas decimais', () => {
    const semCasas = { ...validEvent, data: { ...validEvent.data, value: '1000' } };

    expect(transactionCreatedEventSchema.safeParse(semCasas).success).toBe(false);
  });

  it('recusa valor monetario com mais de duas casas decimais', () => {
    const casasDemais = { ...validEvent, data: { ...validEvent.data, value: '1000.001' } };

    expect(transactionCreatedEventSchema.safeParse(casasDemais).success).toBe(false);
  });

  it('recusa evento de outro tipo no mesmo formato', () => {
    const outroTipo = { ...validEvent, eventType: 'transaction.status.updated' };

    expect(transactionCreatedEventSchema.safeParse(outroTipo).success).toBe(false);
  });
});
