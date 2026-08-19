import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
  listTransactionsQuerySchema,
} from './list-transactions';

describe('listTransactionsQuerySchema', () => {
  it('assume a primeira pagina quando a query vem vazia', () => {
    expect(listTransactionsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('coage os numeros que chegam como texto na querystring', () => {
    const query = listTransactionsQuerySchema.parse({
      transferTypeId: '1',
      page: '3',
      pageSize: '50',
    });

    expect(query).toMatchObject({ transferTypeId: 1, page: 3, pageSize: 50 });
  });

  it('converte as fronteiras do periodo em instantes', () => {
    const query = listTransactionsQuerySchema.parse({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.999Z',
    });

    expect(query.from).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(query.to).toEqual(new Date('2026-08-31T23:59:59.999Z'));
  });

  it('recusa periodo invertido', () => {
    const result = listTransactionsQuerySchema.safeParse({
      from: '2026-08-31T00:00:00.000Z',
      to: '2026-08-01T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('recusa data sem fuso, que nao define um instante', () => {
    expect(listTransactionsQuerySchema.safeParse({ from: '2026-08-01' }).success).toBe(false);
  });

  it('recusa status fora do vocabulario publico', () => {
    expect(listTransactionsQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });

  it('recusa pagina acima do teto de tamanho', () => {
    const result = listTransactionsQuerySchema.safeParse({ pageSize: MAX_PAGE_SIZE + 1 });

    expect(result.success).toBe(false);
  });

  it('recusa deslocamento acima do teto, onde paginar por offset deixa de servir', () => {
    expect(listTransactionsQuerySchema.safeParse({ page: MAX_PAGE + 1 }).success).toBe(false);
  });

  it('recusa filtro desconhecido, em vez de devolver a lista inteira em silencio', () => {
    expect(listTransactionsQuerySchema.safeParse({ transferType: '1' }).success).toBe(false);
  });
});
