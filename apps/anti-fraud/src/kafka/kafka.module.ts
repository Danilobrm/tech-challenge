import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { KafkaOptions } from '@nestjs/microservices';

import type { Env } from '../config/env';
import { KafkaEventPublisher } from './kafka-event.publisher';
import { KAFKA_PRODUCER } from './kafka.tokens';

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
              clientId: `${config.get('KAFKA_CLIENT_ID', { infer: true })}-anti-fraud-producer`,
              brokers: config.get('KAFKA_BROKERS', { infer: true }).split(','),
            },
            // Este cliente so publica: sem isto ele ainda subiria um consumidor de
            // respostas que nunca receberia nada.
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
