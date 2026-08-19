import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { UnknownTransferTypeError } from '../domain/transaction';
import type {
  NewPendingTransaction,
  OutboxMessageDraft,
  PersistedTransaction,
} from '../domain/transaction';
import type { PendingTransactionWriter } from '../domain/transaction.ports';
import { toPersistedTransaction } from './to-persisted-transaction';

/** Codigo do Prisma para violacao de chave estrangeira. */
const FOREIGN_KEY_VIOLATION = 'P2003';

/**
 * Grava o agregado e o evento numa unica transacao do Postgres. E o ponto inteiro da
 * outbox: sem isso, `INSERT` no banco e `publish` no Kafka seriam duas escritas em dois
 * sistemas sem transacao comum, e uma queda entre elas deixaria transacao sem evento
 * (nunca validada) ou evento sem transacao (validando o que nao existe).
 */
@Injectable()
export class PrismaPendingTransactionWriter implements PendingTransactionWriter {
  constructor(private readonly prisma: PrismaService) {}

  async savePending(
    transaction: NewPendingTransaction,
    describeCreation: (transactionExternalId: string) => OutboxMessageDraft,
  ): Promise<PersistedTransaction> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            accountExternalIdDebit: transaction.accountExternalIdDebit,
            accountExternalIdCredit: transaction.accountExternalIdCredit,
            transferTypeId: transaction.transferTypeId,
            value: transaction.value,
            createdAt: transaction.createdAt,
          },
          include: { transferType: true },
        });

        const message = describeCreation(created.id);

        await tx.outboxMessage.create({
          data: {
            aggregateType: message.aggregateType,
            aggregateId: message.aggregateId,
            eventType: message.eventType,
            payload: message.payload,
            occurredAt: message.occurredAt,
          },
        });

        return toPersistedTransaction(created);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new UnknownTransferTypeError(transaction.transferTypeId);
      }

      throw error;
    }
  }
}
