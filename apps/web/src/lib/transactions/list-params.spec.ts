import { describe, expect, it } from 'vitest';

import { EMPTY_FILTERS, hasActiveFilter, toListParams } from '@/lib/transactions/list-params';

describe('toListParams', () => {
  it('envia so a pagina quando nenhum filtro esta preenchido', () => {
    expect(toListParams(EMPTY_FILTERS, 1)).toEqual({ page: '1' });
  });

  it('envia status e tipo como a api os espera', () => {
    expect(toListParams({ ...EMPTY_FILTERS, status: 'approved', transferTypeId: '2' }, 3)).toEqual({
      page: '3',
      status: 'approved',
      transferTypeId: '2',
    });
  });

  it('transforma o dia do calendario em instante com fuso', () => {
    const params = toListParams({ ...EMPTY_FILTERS, from: '2026-08-01', to: '2026-08-31' }, 1);

    expect(params['from']).toBe(new Date('2026-08-01T00:00:00.000').toISOString());
    expect(params['to']).toBe(new Date('2026-08-31T23:59:59.999').toISOString());
  });

  it('inclui o dia inteiro no fim do periodo', () => {
    const params = toListParams({ ...EMPTY_FILTERS, to: '2026-08-31' }, 1);
    const to = new Date(String(params['to']));

    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
  });

  it('ignora data incompleta, que o campo entrega enquanto o usuario digita', () => {
    expect(toListParams({ ...EMPTY_FILTERS, from: '2026-08' }, 1)).toEqual({ page: '1' });
  });

  it('ignora dia que nao existe no calendario', () => {
    expect(toListParams({ ...EMPTY_FILTERS, from: '2026-02-31' }, 1)).toEqual({ page: '1' });
  });
});

describe('hasActiveFilter', () => {
  it('reconhece o formulario limpo', () => {
    expect(hasActiveFilter(EMPTY_FILTERS)).toBe(false);
  });

  it('reconhece qualquer campo preenchido', () => {
    expect(hasActiveFilter({ ...EMPTY_FILTERS, status: 'rejected' })).toBe(true);
  });
});
