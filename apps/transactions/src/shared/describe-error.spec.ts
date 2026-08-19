import { describe, expect, it } from 'vitest';

import { describeError } from './describe-error';

describe('describeError', () => {
  it('usa a mensagem quando o que foi lancado e um Error', () => {
    expect(describeError(new Error('broker indisponivel'))).toBe('broker indisponivel');
  });

  it('devolve a propria string quando foi uma string que subiu', () => {
    expect(describeError('broker indisponivel')).toBe('broker indisponivel');
  });

  it('serializa o objeto lancado', () => {
    expect(describeError({ code: 'ECONNREFUSED' })).toBe('{"code":"ECONNREFUSED"}');
  });

  it('descreve o que nao tem serializacao em JSON', () => {
    expect(describeError(undefined)).toBe('undefined');
  });

  it('nao lanca diante de referencia circular', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(describeError(circular)).toBe('[object Object]');
  });

  it('nao lanca diante de BigInt', () => {
    expect(describeError(10n)).toBe('10');
  });
});
