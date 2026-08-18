import { describeError } from '../shared/describe-error';
import type { Clock } from '@challenge/messaging';
import type { EventPublisher, OutboxRelayReport, PendingOutboxStore } from './outbox.types';

/**
 * Publica o que a outbox tem pendente e marca como publicado. E a segunda metade da
 * solucao do dual write: a primeira gravou evento e agregado juntos, esta entrega o
 * evento com garantia de ao menos uma vez.
 *
 * Reentrega duplicada e esperada aqui — a queda entre o `publish` e o `markPublished`
 * republica a mensagem no proximo ciclo. Quem resolve isso e a deduplicacao por `eventId`
 * no consumidor, nao este worker.
 */
export class OutboxRelay {
  constructor(
    private readonly store: PendingOutboxStore,
    private readonly publisher: EventPublisher,
    private readonly clock: Clock,
    private readonly batchSize: number,
  ) {}

  async publishPending(): Promise<OutboxRelayReport> {
    const pending = await this.store.listPending(this.batchSize);
    const report: OutboxRelayReport = { published: 0, failed: 0 };

    for (const message of pending) {
      try {
        await this.publisher.publish(message.eventType, message.aggregateId, message.payload);
        await this.store.markPublished(message.id, this.clock.now());
        report.published += 1;
      } catch (error) {
        // Falha de uma mensagem nao interrompe o lote: sem fila de mensagens mortas, parar
        // no primeiro erro deixaria uma mensagem defeituosa segurando todas as seguintes.
        await this.store.markFailed(message.id, describeError(error));
        report.failed += 1;
      }
    }

    return report;
  }
}
