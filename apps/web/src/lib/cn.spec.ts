import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/cn';

describe('cn', () => {
  it('junta as classes recebidas', () => {
    expect(cn('rounded-control', 'text-sm')).toBe('rounded-control text-sm');
  });

  it('descarta o que a condicao deixou de fora', () => {
    expect(cn('bg-surface', false, undefined, null, 'text-ink')).toBe('bg-surface text-ink');
  });
});
