import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { describeError } from '../../shared/describe-error';
import { OutboxRelay } from '../application/outbox-relay';

/**
 * Ritmo do worker. Fica no codigo, e nao no ambiente, porque `@Interval` e um decorator:
 * o valor precisa existir em tempo de carga do modulo. E ajuste de latencia, nao
 * configuracao de infraestrutura.
 */
export const OUTBOX_POLL_INTERVAL_MS = 1_000;
export const OUTBOX_BATCH_SIZE = 50;

@Injectable()
export class OutboxRelayScheduler {
  private readonly logger = new Logger(OutboxRelayScheduler.name);
  private running = false;

  constructor(private readonly relay: OutboxRelay) {}

  @Interval(OUTBOX_POLL_INTERVAL_MS)
  async publishPending(): Promise<void> {
    // O intervalo nao espera o ciclo anterior. Sem a trava, um lote lento acumularia
    // execucoes concorrentes publicando a mesma mensagem.
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const report = await this.relay.publishPending();

      if (report.failed > 0) {
        this.logger.warn(`${report.failed} mensagem(ns) da outbox falharam ao publicar`);
      }
    } catch (error) {
      // Banco ou broker fora do ar nao derruba o worker: o proximo ciclo tenta de novo,
      // e as mensagens continuam pendentes ate serem publicadas.
      this.logger.error(`Ciclo da outbox falhou: ${describeError(error)}`);
    } finally {
      this.running = false;
    }
  }
}
