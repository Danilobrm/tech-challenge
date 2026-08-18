import { describe, expect, it } from 'vitest';

import { compareMonetaryAmounts } from './monetary-amount';

describe('compareMonetaryAmounts', () => {
  it('reconhece igualdade no limite exato', () => {
    expect(compareMonetaryAmounts('1000.00', '1000.00')).toBe(0);
  });

  it('ordena por centavo, sem erro de ponto flutuante', () => {
    expect(compareMonetaryAmounts('1000.01', '1000.00')).toBe(1);
    expect(compareMonetaryAmounts('999.99', '1000.00')).toBe(-1);
    expect(compareMonetaryAmounts('0.10', '0.09')).toBe(1);
  });

  it('compara valores acima da faixa exata de Number', () => {
    expect(compareMonetaryAmounts('9007199254740993.01', '9007199254740993.00')).toBe(1);
  });
});
