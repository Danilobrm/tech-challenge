import { describe, expect, it } from 'vitest';

import { createTransactionSchema, toMonetaryAmount } from './create-transaction';

const validInput = {
  accountExternalIdDebit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e72',
  accountExternalIdCredit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e73',
  transferTypeId: 1,
  value: 120,
};

describe('createTransactionSchema', () => {
  it('aceita o corpo do enunciado', () => {
    expect(createTransactionSchema.parse(validInput)).toEqual(validInput);
  });

  it('recusa valor com mais de duas casas decimais', () => {
    const result = createTransactionSchema.safeParse({ ...validInput, value: 10.005 });

    expect(result.success).toBe(false);
  });

  it('recusa valor zerado ou negativo', () => {
    expect(createTransactionSchema.safeParse({ ...validInput, value: 0 }).success).toBe(false);
    expect(createTransactionSchema.safeParse({ ...validInput, value: -1 }).success).toBe(false);
  });

  it('recusa identificador de conta que nao e uuid', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      accountExternalIdDebit: 'conta-1',
    });

    expect(result.success).toBe(false);
  });
});

describe('toMonetaryAmount', () => {
  it('escreve o valor sempre com duas casas', () => {
    expect(toMonetaryAmount(120)).toBe('120.00');
    expect(toMonetaryAmount(1000)).toBe('1000.00');
    expect(toMonetaryAmount(1000.01)).toBe('1000.01');
  });
});
