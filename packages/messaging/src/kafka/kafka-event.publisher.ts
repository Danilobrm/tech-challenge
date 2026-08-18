import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { KAFKA_PRODUCER } from './kafka.tokens';

/**
 * Payload de uma mensagem. Tipado como JSON, e nao como `Record<string, unknown>`: o que
 * nao serializa nao pode chegar ao produtor.
 */
export type MessageValue =
  string | number | boolean | null | MessageValue[] | { [key: string]: MessageValue };

export type MessagePayload = { [key: string]: MessageValue };

export interface EventPublisher {
  publish(topic: string, key: string, payload: MessagePayload): Promise<void>;
}

@Injectable()
export class KafkaEventPublisher implements EventPublisher, OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(KAFKA_PRODUCER) private readonly client: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }

  async publish(topic: string, key: string, payload: MessagePayload): Promise<void> {
    // `emit`, nunca `send`: `send` criaria topico de resposta e tornaria a publicacao uma
    // chamada sincrona. O `firstValueFrom` espera o broker confirmar — sem ele a mensagem
    // seria dada como publicada antes de sair.
    await firstValueFrom(this.client.emit(topic, { key, value: payload }));
  }
}
