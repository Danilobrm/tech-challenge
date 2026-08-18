import { z } from 'zod';

/**
 * Envelope comum a todo evento do fluxo. Os campos de identificacao ficam fora de `data`
 * para que qualquer consumidor consiga correlacionar, deduplicar e versionar uma mensagem
 * sem precisar conhecer o payload dela.
 */
export const eventEnvelopeShape = {
  /// Identidade da mensagem. E o que o consumidor grava para deduplicar reentrega.
  eventId: z.uuid(),
  eventType: z.string().min(1),
  /// Versao do formato de `data`. Muda quando o payload deixa de ser compativel.
  version: z.int().positive(),
  /// Hora do fato no dominio, nao a hora da publicacao: a outbox pode publicar minutos
  /// depois, e reprocessar nao pode reescrever a linha do tempo.
  occurredAt: z.iso.datetime(),
  /// Amarra todos os eventos originados da mesma requisicao do usuario.
  correlationId: z.uuid(),
} as const;

export const eventEnvelopeSchema = z.object(eventEnvelopeShape);

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
