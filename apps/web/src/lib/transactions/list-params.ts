import type { TransactionStatusLabel } from '@challenge/contracts';

/**
 * O que os campos do formulario seguram. Tudo texto, porque e o que `<select>` e
 * `<input type="date">` produzem — a conversao para o formato da API acontece em um lugar
 * so, aqui embaixo, e nao espalhada pelos componentes.
 *
 * String vazia e "sem filtro". A alternativa, `undefined`, obrigaria cada campo controlado
 * a ganhar um valor de fallback so para o React nao trocar de nao-controlado para
 * controlado no meio da digitacao.
 */
export interface TransactionFilters {
  status: TransactionStatusLabel | '';
  transferTypeId: string;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  status: '',
  transferTypeId: '',
  from: '',
  to: '',
};

export function hasActiveFilter(filters: TransactionFilters): boolean {
  return Object.values(filters).some((value) => value !== '');
}

const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Converte o dia do calendario na fronteira do periodo, no fuso de quem esta olhando.
 *
 * A API exige instante completo com fuso, e o campo de data entrega so o dia. Quem resolve
 * a ambiguidade e o navegador: "18 de agosto" para o usuario comeca a meia-noite dele, nao
 * a meia-noite de UTC.
 *
 * O dia e conferido depois de montado porque o construtor de `Date` transborda em silencio:
 * 31 de fevereiro vira 3 de marco, e o usuario receberia um periodo que nao foi o pedido.
 */
function toInstant(day: string, endOfDay: boolean): string | null {
  const parts = CALENDAR_DAY.exec(day);

  if (parts === null) {
    return null;
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const dayOfMonth = Number(parts[3]);

  const instant = endOfDay
    ? new Date(year, month - 1, dayOfMonth, 23, 59, 59, 999)
    : new Date(year, month - 1, dayOfMonth, 0, 0, 0, 0);

  const overflowed =
    instant.getFullYear() !== year ||
    instant.getMonth() !== month - 1 ||
    instant.getDate() !== dayOfMonth;

  return overflowed ? null : instant.toISOString();
}

/**
 * Monta a querystring do `GET /transactions`. Campo vazio nao vira parametro vazio: o
 * schema da API e estrito e trataria `status=` como valor invalido, em vez de filtro ausente.
 */
export function toListParams(filters: TransactionFilters, page: number): Record<string, string> {
  const params: Record<string, string> = { page: String(page) };

  if (filters.status !== '') {
    params['status'] = filters.status;
  }

  if (filters.transferTypeId !== '') {
    params['transferTypeId'] = filters.transferTypeId;
  }

  const from = toInstant(filters.from, false);

  if (from !== null) {
    params['from'] = from;
  }

  const to = toInstant(filters.to, true);

  if (to !== null) {
    params['to'] = to;
  }

  return params;
}
