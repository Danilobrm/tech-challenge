import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { KafkaOptions } from '@nestjs/microservices';

import type { Env } from '../config/env';
import { KafkaEventPublisher } from './kafka-event.publisher';

export const KAFKA_PRODUCER = 'KAFKA_PRODUCER';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_PRODUCER,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>): KafkaOptions => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              // Sufixo por servico: os dois compartilham o KAFKA_CLIENT_ID do ambiente, e
              // sem isso o Kafka UI mostra os dois produtores com o mesmo nome.
              clientId: `${config.get('KAFKA_CLIENT_ID', { infer: true })}-transactions-producer`,
              brokers: config.get('KAFKA_BROKERS', { infer: true }).split(','),
            },
            // Este servico so publica por `emit`. Sem isto o cliente ainda sobe um
            // consumidor de respostas, com grupo proprio, que nunca receberia nada.
            producerOnlyMode: true,
          },
        }),
      },
    ]),
  ],
  providers: [KafkaEventPublisher],
  exports: [KafkaEventPublisher],
})
export class KafkaModule {}
