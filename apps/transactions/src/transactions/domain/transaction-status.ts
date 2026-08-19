import type { TransactionStatusLabel } from '@challenge/contracts';

import type { TransactionStatusName } from './transaction';

/**
 * Traducao entre o enum gravado e o vocabulario publico da API, nos dois sentidos: a
 * leitura devolve o rotulo e o filtro recebe o rotulo. Um mapa so, para que o nome exposto
 * na resposta e o nome aceito no filtro nunca possam divergir.
 */
const LABELS: Record<TransactionStatusName, TransactionStatusLabel> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const NAMES: Record<TransactionStatusLabel, TransactionStatusName> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

export function toStatusLabel(status: TransactionStatusName): TransactionStatusLabel {
  return LABELS[status];
}

export function toStatusName(label: TransactionStatusLabel): TransactionStatusName {
  return NAMES[label];
}
