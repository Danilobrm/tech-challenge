import type { TransactionStatusLabel } from '@challenge/contracts';

import type { Tone } from '@/lib/tone';

/**
 * O vocabulario da API e estavel e em ingles; a tela fala o idioma do usuario. A traducao
 * mora aqui, e nao no componente, para o dia em que o status novo aparecer: o compilador
 * aponta este objeto, em vez de a tela mostrar `partially_reversed` para quem le.
 */
const STATUS_TEXT: Record<TransactionStatusLabel, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
};

export function statusText(status: TransactionStatusLabel): string {
  return STATUS_TEXT[status];
}

/**
 * Tom do selo por status. Nome de tom, e nao classe de cor: `lib` nao conhece Tailwind, e
 * trocar a paleta nao pode significar mexer em conversao de dominio.
 */
const STATUS_TONE: Record<TransactionStatusLabel, Tone> = {
  pending: 'attention',
  approved: 'positive',
  rejected: 'critical',
};

export function statusTone(status: TransactionStatusLabel): Tone {
  return STATUS_TONE[status];
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** A API devolve o instante em UTC; a tela mostra no fuso de quem esta olhando. */
export function formatDateTime(isoInstant: string): string {
  return dateTimeFormatter.format(new Date(isoInstant));
}
