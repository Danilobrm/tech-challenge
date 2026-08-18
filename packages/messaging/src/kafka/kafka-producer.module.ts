import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { KafkaOptions } from '@nestjs/microservices';

import { KafkaEventPublisher } from './kafka-event.publisher';
import { KAFKA_PRODUCER } from './kafka.tokens';

/**
 * Fiacao do produtor Kafka, identica nos dois servicos. Le `KAFKA_CLIENT_ID` e
 * `KAFKA_BROKERS` do ambiente — cada app ja valida esses nomes com Zod no proprio boot,
 * entao aqui eles sao pre-requisito, nao configuracao nova.
 */
@Module({})
export class KafkaProducerModule {
  /**
   * @param serviceName sufixo do `clientId`. Os dois servicos compartilham o
   * `KAFKA_CLIENT_ID`, e sem o sufixo o Kafka UI mostra os dois produtores com o mesmo nome.
   */
  static forService(serviceName: string): DynamicModule {
    return {
      module: KafkaProducerModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: KAFKA_PRODUCER,
            inject: [ConfigService],
            useFactory: (config: ConfigService): KafkaOptions => ({
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: `${config.getOrThrow<string>('KAFKA_CLIENT_ID')}-${serviceName}-producer`,
                  brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
                },
                // Estes clientes so publicam: sem isto o transporte ainda subiria um
                // consumidor de respostas, com grupo proprio, que nunca receberia nada.
                producerOnlyMode: true,
              },
            }),
          },
        ]),
      ],
      providers: [KafkaEventPublisher],
      exports: [KafkaEventPublisher],
    };
  }
}
