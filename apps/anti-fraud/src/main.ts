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
  const port = config.get('ANTI_FRAUD_PORT', { infer: true });
  const clientId = config.get('KAFKA_CLIENT_ID', { infer: true });

  // Aplicacao hibrida: o /health continua em HTTP, e o consumo de eventos entra pelo
  // transporte de microservico.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: `${clientId}-anti-fraud`,
        brokers: config.get('KAFKA_BROKERS', { infer: true }).split(','),
      },
      consumer: { groupId: config.get('KAFKA_GROUP_ID_ANTI_FRAUD', { infer: true }) },
      // Do inicio do topico: sem isto, um grupo novo comeca no fim da fila e perde toda
      // transacao criada antes do servico subir.
      subscribe: { fromBeginning: true },
    },
  });

  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.listen(port);

  // `pnpm dev` sobe os tres apps na mesma saida: sem a url, saber em que porta cada um
  // subiu exige abrir o .env.
  new Logger('anti-fraud').log(`no ar em http://localhost:${port} (health: /health)`);
}

void bootstrap();
