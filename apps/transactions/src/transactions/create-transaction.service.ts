import {
  TRANSACTION_CREATED,
  TRANSACTION_CREATED_VERSION,
  toMonetaryAmount,
  transactionCreatedEventSchema,
} from '@challenge/contracts';
import type { CreateTransactionInput } from '@challenge/contracts';

import type { Clock } from '../shared/clock';
import type { IdGenerator } from '../shared/id-generator';
import type { PersistedTransaction, PendingTransactionWriter } from './transaction.types';

export const TRANSACTION_AGGREGATE = 'transaction';

/**
 * Cria a transacao como `PENDING` e descreve o evento de criacao na mesma unidade de
 * trabalho. Nao espera a antifraude: o resultado chega depois, por outro evento.
 *
 * Classe pura de proposito — nao conhece Nest, Prisma nem Kafka. O que ela precisa entra
 * pelo construtor, e e por isso que o teste consegue afirmar o conteudo do evento sem
 * subir nada.
 */
export class CreateTransaction {
  constructor(
    private readonly transactions: PendingTransactionWriter,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateTransactionInput): Promise<PersistedTransaction> {
    const occurredAt = this.clock.now();
    const correlationId = this.ids.next();
    const value = toMonetaryAmount(input.value);

    return this.transactions.savePending(
      {
        accountExternalIdDebit: input.accountExternalIdDebit,
        accountExternalIdCredit: input.accountExternalIdCredit,
        transferTypeId: input.transferTypeId,
        value,
        // O mesmo instante vai para a linha e para o evento: `occurredAt` e a hora do
        // fato, e a outbox pode publicar bem depois.
        createdAt: occurredAt,
      },
      (transactionExternalId) => ({
        aggregateType: TRANSACTION_AGGREGATE,
        // Vira a chave de particao no Kafka: tudo de uma mesma transacao em ordem.
        aggregateId: transactionExternalId,
        eventType: TRANSACTION_CREATED,
        occurredAt,
        // Validar o proprio evento antes de gravar impede que a outbox guarde um payload
        // que o consumidor recusaria — falha na criacao e visivel, falha na entrega nao.
        payload: transactionCreatedEventSchema.parse({
          eventId: this.ids.next(),
          eventType: TRANSACTION_CREATED,
          version: TRANSACTION_CREATED_VERSION,
          occurredAt: occurredAt.toISOString(),
          correlationId,
          data: {
            transactionExternalId,
            accountExternalIdDebit: input.accountExternalIdDebit,
            accountExternalIdCredit: input.accountExternalIdCredit,
            transferTypeId: input.transferTypeId,
            value,
          },
        }),
      }),
    );
  }
}
