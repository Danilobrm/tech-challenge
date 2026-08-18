import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { JsonObject } from '@challenge/contracts';
import type { PendingOutboxMessage, PendingOutboxStore } from '../domain/outbox.ports';

/**
 * Fronteira entre a coluna `jsonb` e o dominio: o banco devolve qualquer JSON, e o worker
 * so sabe publicar objeto. Falhar aqui aponta a linha exata, em vez de virar erro de
 * serializacao no meio do producer.
 */
function asJsonObject(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('payload da outbox nao e um objeto JSON');
  }

  return value as JsonObject;
}

@Injectable()
export class PrismaOutboxStore implements PendingOutboxStore {
  constructor(private readonly prisma: PrismaService) {}

  async listPending(limit: number): Promise<PendingOutboxMessage[]> {
    const messages = await this.prisma.outboxMessage.findMany({
      where: { publishedAt: null },
      // Pela hora do fato, nao pela hora da insercao: e a ordem em que o dominio aconteceu.
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });

    return messages.map((message) => ({
      id: message.id,
      aggregateId: message.aggregateId,
      eventType: message.eventType,
      payload: asJsonObject(message.payload),
    }));
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    // O `publishedAt: null` no filtro deixa a marcacao idempotente: com mais de uma
    // instancia do worker, quem chegar depois nao reescreve a hora de quem publicou.
    await this.prisma.outboxMessage.updateMany({
      where: { id, publishedAt: null },
      data: { publishedAt },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: error },
    });
  }
}
