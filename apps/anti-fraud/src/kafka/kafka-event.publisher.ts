import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import type { JsonObject } from '@challenge/contracts';
import { firstValueFrom } from 'rxjs';

import { KAFKA_PRODUCER } from './kafka.tokens';

export interface EventPublisher {
  publish(topic: string, key: string, payload: JsonObject): Promise<void>;
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

  async publish(topic: string, key: string, payload: JsonObject): Promise<void> {
    // `emit`, nunca `send`: `send` criaria topico de resposta e tornaria a validacao
    // sincrona, que e exatamente o que o enunciado proibe.
    await firstValueFrom(this.client.emit(topic, { key, value: payload }));
  }
}
