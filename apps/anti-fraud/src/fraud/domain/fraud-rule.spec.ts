import { describe, expect, it } from 'vitest';

import { TransactionFraudRule } from './fraud-rule';

describe('TransactionFraudRule', () => {
  const rule = new TransactionFraudRule();

  it('aprova o valor exato do limite', () => {
    expect(rule.evaluate('1000.00')).toEqual({
      status: 'APPROVED',
      reason: 'value_within_limit',
    });
  });

  it('rejeita um centavo acima do limite', () => {
    expect(rule.evaluate('1000.01')).toEqual({
      status: 'REJECTED',
      reason: 'value_above_limit',
    });
  });

  it('aprova valor abaixo do limite', () => {
    expect(rule.evaluate('500.00').status).toBe('APPROVED');
    expect(rule.evaluate('999.99').status).toBe('APPROVED');
  });

  it('rejeita valor bem acima do limite', () => {
    expect(rule.evaluate('5000.00').status).toBe('REJECTED');
  });
});
