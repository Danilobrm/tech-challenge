import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import type { StatusUpdateOutcome, TransactionResolutionUpdate } from '../domain/transaction';
import type { TransactionStatusStore } from '../domain/transaction.ports';

const FOREIGN_KEY_VIOLATION = 'P2003';

/**
 * Idempotencia em duas camadas, na mesma transacao do Postgres:
 *
 * 1. o `@@unique([transactionId, eventId])` decide se este evento ja foi visto. O
 *    `skipDuplicates` vira `ON CONFLICT DO NOTHING`, entao a repeticao e um no-op — e nao
 *    um erro que abortaria a transacao inteira;
 * 2. o `UPDATE ... WHERE id = ? AND status = 'PENDING'` e um compare-and-set: so muda o
 *    que ainda esta pendente. Um `SELECT` seguido de `UPDATE` teria uma janela entre a
 *    leitura e a escrita em que outro consumidor finalizaria a mesma transacao.
 *
 * O compare-and-set vem antes do historico porque e ele quem sabe se houve transicao — o
 * resultado dele e o que a linha do log registra como origem.
 */
@Injectable()
export class PrismaTransactionStatusStore implements TransactionStatusStore {
  constructor(private readonly prisma: PrismaService) {}

  async applyResolution(update: TransactionResolutionUpdate): Promise<StatusUpdateOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const resolved = await tx.transaction.updateMany({
          where: { id: update.transactionExternalId, status: 'PENDING' },
          data: { status: update.toStatus },
        });

        const recorded = await tx.transactionStatusHistory.createMany({
          data: [
            {
              transactionId: update.transactionExternalId,
              // A origem real da transicao, e nao a que o evento presume: se o
              // compare-and-set nao encontrou nada pendente, nenhuma transicao aconteceu, e
              // o log append-only registra a chegada do evento sem inventar um `PENDING`
              // que ja nao estava la.
              fromStatus: resolved.count === 1 ? 'PENDING' : null,
              toStatus: update.toStatus,
              reason: update.reason,
              eventId: update.eventId,
              occurredAt: update.occurredAt,
            },
          ],
          skipDuplicates: true,
        });

        if (recorded.count === 0) {
          return 'duplicated';
        }

        return resolved.count === 1 ? 'applied' : 'ignored';
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        // Resultado para uma transacao que nao existe neste banco. Reentregar nunca faria
        // ela aparecer, entao a mensagem e consumida e registrada.
        return 'unknown-transaction';
      }

      throw error;
    }
  }
}
