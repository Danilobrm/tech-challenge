import { z } from 'zod';

import { eventEnvelopeShape } from './envelope';
import { TRANSACTION_STATUS_UPDATED } from './topics';

export const TRANSACTION_STATUS_UPDATED_VERSION = 1;

/**
 * Resultado da analise. `PENDING` nao aparece aqui: o evento so existe para resolver uma
 * transacao, e um estado terminal e a unica coisa que ele sabe dizer.
 */
export const transactionResolutionSchema = z.enum(['APPROVED', 'REJECTED']);

/// Codigo estavel, nao frase: quem exibe traduz, e o historico guarda o motivo sem
/// depender do idioma de quem publicou.
export const transactionResolutionReasonSchema = z.enum([
  'value_within_limit',
  'value_above_limit',
]);

export const transactionStatusUpdatedDataSchema = z.object({
  transactionExternalId: z.uuid(),
  status: transactionResolutionSchema,
  reason: transactionResolutionReasonSchema,
});

export const transactionStatusUpdatedEventSchema = z.object({
  ...eventEnvelopeShape,
  eventType: z.literal(TRANSACTION_STATUS_UPDATED),
  version: z.literal(TRANSACTION_STATUS_UPDATED_VERSION),
  data: transactionStatusUpdatedDataSchema,
});

export type TransactionResolution = z.infer<typeof transactionResolutionSchema>;
export type TransactionResolutionReason = z.infer<typeof transactionResolutionReasonSchema>;
export type TransactionStatusUpdatedData = z.infer<typeof transactionStatusUpdatedDataSchema>;
export type TransactionStatusUpdatedEvent = z.infer<typeof transactionStatusUpdatedEventSchema>;
