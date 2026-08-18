import type { JsonObject } from '@challenge/contracts';

export interface PendingOutboxMessage {
  id: string;
  /// Chave de particao: mantem em ordem tudo que pertence ao mesmo agregado.
  aggregateId: string;
  /// Tambem e o nome do topico — um topico por tipo de evento.
  eventType: string;
  payload: JsonObject;
}

export interface PendingOutboxStore {
  listPending(limit: number): Promise<PendingOutboxMessage[]>;
  markPublished(id: string, publishedAt: Date): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface EventPublisher {
  publish(topic: string, key: string, payload: JsonObject): Promise<void>;
}

export interface OutboxRelayReport {
  published: number;
  failed: number;
}
