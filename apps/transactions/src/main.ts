import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import type { Env } from './config/env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const port = config.get('TRANSACTIONS_PORT', { infer: true });

  // Sem os hooks, `onApplicationShutdown` nao roda e o produtor Kafka fica com conexao
  // aberta no encerramento.
  app.enableShutdownHooks();

  await app.listen(port);

  // `pnpm dev` sobe os tres apps na mesma saida: sem a url, saber em que porta cada um
  // subiu exige abrir o .env.
  new Logger('transactions').log(`no ar em http://localhost:${port} (health: /health)`);
}

void bootstrap();
