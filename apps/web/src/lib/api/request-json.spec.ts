import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiError } from '@/lib/api/api-error';
import { requestJson } from '@/lib/api/request-json';

const schema = z.object({ ok: z.boolean() });

function respondWith(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestJson', () => {
  it('monta a url a partir da variavel de ambiente, sem barra dobrada', async () => {
    respondWith({ ok: true });

    await requestJson({ path: '/transactions', schema, searchParams: { page: '2' } });

    expect(vi.mocked(fetch).mock.calls[0]?.[0]?.toString()).toBe(
      'http://api.test/transactions?page=2',
    );
  });

  it('devolve o corpo ja validado pelo schema', async () => {
    respondWith({ ok: true });

    await expect(requestJson({ path: '/transactions', schema })).resolves.toEqual({ ok: true });
  });

  it('traduz falha de rede em erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(requestJson({ path: '/transactions', schema })).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('traduz status de erro da api', async () => {
    respondWith({}, 500);

    await expect(requestJson({ path: '/transactions', schema })).rejects.toMatchObject({
      kind: 'http',
      message: 'A API respondeu com o status 500.',
    });
  });

  it('recusa corpo que nao bate com o contrato', async () => {
    respondWith({ ok: 'sim' });

    const failure = await requestJson({ path: '/transactions', schema }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind: 'payload' });
  });

  it('repassa a explicacao que a api deu para o erro', async () => {
    respondWith({ message: 'from deve ser anterior ou igual a to' }, 400);

    await expect(requestJson({ path: '/transactions', schema })).rejects.toMatchObject({
      kind: 'http',
      message: 'from deve ser anterior ou igual a to',
    });
  });

  it('junta as varias mensagens de uma validacao', async () => {
    respondWith({ message: ['status invalido', 'page deve ser positivo'] }, 400);

    await expect(requestJson({ path: '/transactions', schema })).rejects.toMatchObject({
      message: 'status invalido; page deve ser positivo',
    });
  });

  it('deixa o cancelamento subir, porque nao e falha', async () => {
    const abort = new Error('The operation was aborted.');
    abort.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));

    await expect(requestJson({ path: '/transactions', schema })).rejects.toThrow(
      /operation was aborted/,
    );
  });
});
