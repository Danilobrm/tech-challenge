import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  TRANSACTION_STATUS_UPDATED,
  transactionStatusUpdatedEventSchema,
} from '@challenge/contracts';

import { ApplyTransactionResolution } from './apply-transaction-resolution.service';

/** Adaptador fino: valida o payload, delega e registra o desfecho. */
@Controller()
export class TransactionStatusHandler {
  private readonly logger = new Logger(TransactionStatusHandler.name);

  constructor(private readonly applyResolution: ApplyTransactionResolution) {}

  @EventPattern(TRANSACTION_STATUS_UPDATED)
  async handle(@Payload() message: unknown): Promise<void> {
    const received = transactionStatusUpdatedEventSchema.safeParse(message);

    if (!received.success) {
      // Fora do contrato nunca vira valido: reentregar travaria a particao atras dele.
      this.logger.error(
        `Evento ${TRANSACTION_STATUS_UPDATED} descartado por nao satisfazer o contrato: ${received.error.message}`,
      );

      return;
    }

    // Falha de banco sobe: sem a excecao o offset avancaria e o resultado se perderia.
    const outcome = await this.applyResolution.execute(received.data);

    if (outcome !== 'applied') {
      this.logger.log(
        `Evento ${received.data.eventId} da transacao ${received.data.data.transactionExternalId}: ${outcome}`,
      );
    }
  }
}
