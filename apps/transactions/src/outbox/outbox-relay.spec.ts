import { beforeEach, describe, expect, it } from 'vitest';

import type { Clock } from '@challenge/messaging';
import type { JsonObject } from '@challenge/contracts';
import { OutboxRelay } from './outbox-relay';
import type { EventPublisher, PendingOutboxMessage, PendingOutboxStore } from './outbox.types';

const PUBLISHED_AT = new Date('2026-08-18T12:00:05.000Z');

function pendingMessage(id: string, aggregateId: string): PendingOutboxMessage {
  return {
    id,
    aggregateId,
    eventType: 'transaction.created',
    payload: { eventId: id, data: { transactionExternalId: aggregateId } },
  };
}

class FakeStore implements PendingOutboxStore {
  published: Array<{ id: string; publishedAt: Date }> = [];
  failures: Array<{ id: string; error: string }> = [];

  constructor(private readonly pending: PendingOutboxMessage[]) {}

  listPending(limit: number): Promise<PendingOutboxMessage[]> {
    return Promise.resolve(this.pending.slice(0, limit));
  }

  markPublished(id: string, publishedAt: Date): Promise<void> {
    this.published.push({ id, publishedAt });

    return Promise.resolve();
  }

  markFailed(id: string, error: string): Promise<void> {
    this.failures.push({ id, error });

    return Promise.resolve();
  }
}

class RecordingPublisher implements EventPublisher {
  sent: Array<{ topic: string; key: string; payload: JsonObject }> = [];

  constructor(private readonly failFor: ReadonlySet<string> = new Set()) {}

  publish(topic: string, key: string, payload: JsonObject): Promise<void> {
    if (this.failFor.has(key)) {
      return Promise.reject(new Error('broker indisponivel'));
    }

    this.sent.push({ topic, key, payload });

    return Promise.resolve();
  }
}

class FixedClock implements Clock {
  now(): Date {
    return PUBLISHED_AT;
  }
}

describe('OutboxRelay', () => {
  let publisher: RecordingPublisher;

  beforeEach(() => {
    publisher = new RecordingPublisher();
  });

  it('publica cada pendente no topico do evento e marca a hora da publicacao', async () => {
    const store = new FakeStore([pendingMessage('msg-1', 'tx-1')]);
    const relay = new OutboxRelay(store, publisher, new FixedClock(), 50);

    const report = await relay.publishPending();

    expect(publisher.sent).toEqual([
      {
        topic: 'transaction.created',
        key: 'tx-1',
        payload: { eventId: 'msg-1', data: { transactionExternalId: 'tx-1' } },
      },
    ]);
    expect(store.published).toEqual([{ id: 'msg-1', publishedAt: PUBLISHED_AT }]);
    expect(report).toEqual({ published: 1, failed: 0 });
  });

  it('usa o id do agregado como chave de particao', async () => {
    const store = new FakeStore([pendingMessage('msg-1', 'tx-1'), pendingMessage('msg-2', 'tx-2')]);
    const relay = new OutboxRelay(store, publisher, new FixedClock(), 50);

    await relay.publishPending();

    expect(publisher.sent.map((message) => message.key)).toEqual(['tx-1', 'tx-2']);
  });

  it('registra o erro sem marcar como publicada quando o broker recusa', async () => {
    const store = new FakeStore([pendingMessage('msg-1', 'tx-1')]);
    const relay = new OutboxRelay(
      store,
      new RecordingPublisher(new Set(['tx-1'])),
      new FixedClock(),
      50,
    );

    const report = await relay.publishPending();

    expect(store.published).toEqual([]);
    expect(store.failures).toEqual([{ id: 'msg-1', error: 'broker indisponivel' }]);
    expect(report).toEqual({ published: 0, failed: 1 });
  });

  it('segue publicando o restante do lote depois de uma falha', async () => {
    const store = new FakeStore([pendingMessage('msg-1', 'tx-1'), pendingMessage('msg-2', 'tx-2')]);
    const failing = new RecordingPublisher(new Set(['tx-1']));
    const relay = new OutboxRelay(store, failing, new FixedClock(), 50);

    const report = await relay.publishPending();

    expect(failing.sent.map((message) => message.key)).toEqual(['tx-2']);
    expect(report).toEqual({ published: 1, failed: 1 });
  });

  it('respeita o tamanho do lote', async () => {
    const store = new FakeStore([
      pendingMessage('msg-1', 'tx-1'),
      pendingMessage('msg-2', 'tx-2'),
      pendingMessage('msg-3', 'tx-3'),
    ]);
    const relay = new OutboxRelay(store, publisher, new FixedClock(), 2);

    const report = await relay.publishPending();

    expect(report.published).toBe(2);
  });
});
