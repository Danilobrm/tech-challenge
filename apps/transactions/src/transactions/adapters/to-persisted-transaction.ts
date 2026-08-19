import type { Prisma } from '../../generated/prisma/client.js';
import type { PersistedTransaction } from '../domain/transaction';

type TransactionRow = Prisma.TransactionGetPayload<{ include: { transferType: true } }>;

/**
 * Fronteira entre o banco e o dominio. O `Decimal` do Prisma nao atravessa: vira a string
 * de duas casas que o resto do sistema usa como valor monetario, e o nome do tipo vem
 * junto para que a leitura nao precise de uma segunda consulta.
 */
export function toPersistedTransaction(row: TransactionRow): PersistedTransaction {
  return {
    transactionExternalId: row.id,
    transferTypeName: row.transferType.name,
    status: row.status,
    value: row.value.toFixed(2),
    createdAt: row.createdAt,
  };
}
