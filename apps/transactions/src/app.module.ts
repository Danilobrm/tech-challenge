import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { validateEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { OutboxModule } from './outbox/outbox.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Existe um unico .env, na raiz do monorepo — o mesmo que o enunciado manda criar
      // com `cp .env.example .env`.
      envFilePath: '../../.env',
      validate: validateEnv,
    }),
    // Habilita o `@Interval` do worker da outbox.
    ScheduleModule.forRoot(),
    TransactionsModule,
    OutboxModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
