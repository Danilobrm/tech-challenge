import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client.js';
import { createPrismaAdapter } from './prisma-client.factory';

/**
 * Client do Prisma como provider: o ciclo de vida do pool passa a ser o do modulo, entao
 * o processo nao fica pendurado em conexao aberta ao desligar.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({ adapter: createPrismaAdapter(config.get('DATABASE_URL', { infer: true })) });
  }

  async onModuleInit(): Promise<void> {
    // Conectar no boot faz o servico falhar de cara com o banco fora do ar, em vez de
    // aceitar requisicao e so entao descobrir.
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
