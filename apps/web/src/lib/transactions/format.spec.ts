import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDateTime, statusText } from '@/lib/transactions/format';

describe('statusText', () => {
  it('traduz o vocabulario da api para o idioma da tela', () => {
    expect(statusText('pending')).toBe('Pendente');
    expect(statusText('approved')).toBe('Aprovada');
    expect(statusText('rejected')).toBe('Rejeitada');
  });
});

describe('formatCurrency', () => {
  it('escreve o valor como moeda, com duas casas', () => {
    expect(formatCurrency(1000).normalize('NFKC')).toMatch(/R\$\s?1\.000,00/);
    expect(formatCurrency(0.5).normalize('NFKC')).toMatch(/R\$\s?0,50/);
  });
});

describe('formatDateTime', () => {
  it('mostra o instante no fuso de quem esta olhando', () => {
    const instant = '2026-08-18T12:00:00.000Z';
    const local = new Date(instant);

    expect(formatDateTime(instant)).toContain(String(local.getDate()).padStart(2, '0'));
  });
});
