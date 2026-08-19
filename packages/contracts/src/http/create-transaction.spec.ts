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

  // A mensagem e o que o usuario le sob o campo no dashboard e o que a API devolve no 400.
  it('descreve cada falha no idioma de quem le', () => {
    const result = createTransactionSchema.safeParse({
      accountExternalIdDebit: 'conta-1',
      accountExternalIdCredit: validInput.accountExternalIdCredit,
      transferTypeId: Number.NaN,
      value: Number.NaN,
    });

    const messageByField = new Map(
      (result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]),
    );

    expect(messageByField.get('accountExternalIdDebit')).toBe(
      'informe um identificador de conta valido',
    );
    expect(messageByField.get('transferTypeId')).toBe('escolha o tipo de transferencia');
    expect(messageByField.get('value')).toBe('informe o valor da transacao');
  });
});

describe('toMonetaryAmount', () => {
  it('escreve o valor sempre com duas casas', () => {
    expect(toMonetaryAmount(120)).toBe('120.00');
    expect(toMonetaryAmount(1000)).toBe('1000.00');
    expect(toMonetaryAmount(1000.01)).toBe('1000.01');
  });
});
