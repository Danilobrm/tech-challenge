import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { JsonObject } from '@challenge/contracts';
import type { PendingOutboxMessage, PendingOutboxStore } from '../domain/outbox.ports';

/**
 * Teto de tentativas por mensagem. Sem ele, uma mensagem que nunca vai publicar — payload
 * grande demais para o broker, topico sem permissao — fica pendente para sempre e, por ser
 * a mais antiga, encabeca todo lote: um punhado delas bastaria para segurar a fila inteira
 * e travar a publicacao de tudo o que vem depois.
 */
export const OUTBOX_MAX_ATTEMPTS = 5;

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
  private readonly logger = new Logger(PrismaOutboxStore.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPending(limit: number): Promise<PendingOutboxMessage[]> {
    const messages = await this.prisma.outboxMessage.findMany({
      where: { publishedAt: null, attempts: { lt: OUTBOX_MAX_ATTEMPTS } },
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
    const failed = await this.prisma.outboxMessage.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: error },
    });

    if (failed.attempts >= OUTBOX_MAX_ATTEMPTS) {
      // Ultima linha antes do silencio: a partir daqui a mensagem nao volta ao lote, e sem
      // este registro ela sumiria sem ninguem notar.
      this.logger.error(
        `Mensagem ${id} da outbox esgotou as ${OUTBOX_MAX_ATTEMPTS} tentativas e saiu do lote: ${error}`,
      );
    }
  }
}
