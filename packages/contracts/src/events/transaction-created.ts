import { z } from 'zod';

import { eventEnvelopeShape } from './envelope';
import { monetaryAmountSchema } from './monetary-amount';
import { TRANSACTION_CREATED } from './topics';

export const TRANSACTION_CREATED_VERSION = 1;

/**
 * Tudo que a antifraude precisa para decidir. Ela e stateless: nao consulta o banco de
 * transacoes, entao o que nao vier aqui, ela nao tem.
 */
export const transactionCreatedDataSchema = z.object({
  transactionExternalId: z.uuid(),
  accountExternalIdDebit: z.uuid(),
  accountExternalIdCredit: z.uuid(),
  transferTypeId: z.int().positive(),
  value: monetaryAmountSchema,
});

export const transactionCreatedEventSchema = z.object({
  ...eventEnvelopeShape,
  eventType: z.literal(TRANSACTION_CREATED),
  version: z.literal(TRANSACTION_CREATED_VERSION),
  data: transactionCreatedDataSchema,
});

export type TransactionCreatedData = z.infer<typeof transactionCreatedDataSchema>;
export type TransactionCreatedEvent = z.infer<typeof transactionCreatedEventSchema>;
