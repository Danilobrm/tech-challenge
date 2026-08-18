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

  await app.listen(port);

  // `pnpm dev` sobe os tres apps na mesma saida: sem a url, saber em que porta cada um
  // subiu exige abrir o .env.
  new Logger('transactions').log(`no ar em http://localhost:${port} (health: /health)`);
}

void bootstrap();
