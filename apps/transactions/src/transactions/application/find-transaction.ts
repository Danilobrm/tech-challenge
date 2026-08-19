import { TransactionNotFoundError } from '../domain/transaction';
import type { PersistedTransaction } from '../domain/transaction';
import type { TransactionReader } from '../domain/transaction.ports';

/**
 * Consulta pelo identificador externo. Classe pura: a ausencia vira erro de dominio aqui,
 * e nao `null` viajando ate o controller — quem chama nao tem como esquecer do caso.
 */
export class FindTransaction {
  constructor(private readonly transactions: TransactionReader) {}

  async execute(transactionExternalId: string): Promise<PersistedTransaction> {
    const found = await this.transactions.findById(transactionExternalId);

    if (found === null) {
      throw new TransactionNotFoundError(transactionExternalId);
    }

    return found;
  }
}
