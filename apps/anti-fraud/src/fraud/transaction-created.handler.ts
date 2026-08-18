import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  TRANSACTION_CREATED,
  TRANSACTION_STATUS_UPDATED,
  transactionCreatedEventSchema,
} from '@challenge/contracts';

import { KafkaEventPublisher } from '../kafka/kafka-event.publisher';
import { TransactionReview } from './transaction-review';

/**
 * Adaptador fino do Kafka: valida o payload, delega a decisao e publica o resultado.
 * `@EventPattern`, nunca `@MessagePattern` — quem criou a transacao ja recebeu 201 e nao
 * esta esperando resposta nenhuma.
 */
@Controller()
export class TransactionCreatedHandler {
  private readonly logger = new Logger(TransactionCreatedHandler.name);

  constructor(
    private readonly review: TransactionReview,
    private readonly publisher: KafkaEventPublisher,
  ) {}

  @EventPattern(TRANSACTION_CREATED)
  async handle(@Payload() message: unknown): Promise<void> {
    const received = transactionCreatedEventSchema.safeParse(message);

    if (!received.success) {
      // Payload fora do contrato nunca vira valido. Relancar so faria o broker reentregar
      // a mesma mensagem para sempre, travando a particao atras dela.
      this.logger.error(
        `Evento ${TRANSACTION_CREATED} descartado por nao satisfazer o contrato: ${received.error.message}`,
      );

      return;
    }

    const result = this.review.review(received.data);

    // Sem try/catch de proposito: falha ao publicar precisa subir para a mensagem ser
    // reentregue. Engolir aqui deixaria a transacao pendente para sempre, sem rastro.
    await this.publisher.publish(
      TRANSACTION_STATUS_UPDATED,
      result.data.transactionExternalId,
      result,
    );
  }
}
