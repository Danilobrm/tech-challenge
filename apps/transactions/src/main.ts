import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import type { MicroserviceOptions } from '@nestjs/microservices';

import type { Env } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const port = config.get('TRANSACTIONS_PORT', { infer: true });
  const clientId = config.get('KAFKA_CLIENT_ID', { infer: true });

  // Aplicacao hibrida: a API HTTP e o consumo do resultado da antifraude no mesmo
  // processo. O produtor da outbox tem cliente proprio, registrado no KafkaModule.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: `${clientId}-transactions`,
        brokers: config.get('KAFKA_BROKERS', { infer: true }).split(','),
      },
      consumer: { groupId: config.get('KAFKA_GROUP_ID_TRANSACTIONS', { infer: true }) },
      // Do inicio do topico: um grupo novo comecando no fim perderia todo resultado
      // publicado antes de o servico subir, e a transacao ficaria pendente para sempre.
      subscribe: { fromBeginning: true },
    },
  });

  // Sem os hooks, `onApplicationShutdown` nao roda e o produtor Kafka fica com conexao
  // aberta no encerramento.
  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.listen(port);

  // `pnpm dev` sobe os tres apps na mesma saida: sem a url, saber em que porta cada um
  // subiu exige abrir o .env.
  new Logger('transactions').log(`no ar em http://localhost:${port} (health: /health)`);
}

void bootstrap();
