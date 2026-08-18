import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { KAFKA_PRODUCER } from './kafka.module';
import type { EventPublisher } from '../outbox/outbox.types';
import type { JsonObject } from '../transactions/transaction.types';

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
    // `emit`, nunca `send`: `send` criaria topico de resposta e transformaria a
    // publicacao em chamada sincrona. O `firstValueFrom` espera o broker confirmar — sem
    // ele a mensagem seria dada como publicada antes de sair.
    await firstValueFrom(this.client.emit(topic, { key, value: payload }));
  }
}
