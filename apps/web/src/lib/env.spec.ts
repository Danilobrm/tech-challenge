import { describe, expect, it } from 'vitest';

import { parseClientEnv } from './env';

describe('parseClientEnv', () => {
  it('devolve a url da api quando o ambiente esta completo', () => {
    expect(parseClientEnv({ NEXT_PUBLIC_API_URL: 'http://localhost:3001' })).toEqual({
      NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    });
  });

  it('falha quando a url da api esta ausente', () => {
    expect(() => parseClientEnv({})).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
